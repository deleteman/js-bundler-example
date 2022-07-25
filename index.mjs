import JestHasteMap from 'jest-haste-map';
import { cpus } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Resolver from 'jest-resolve';
import { DependencyResolver } from 'jest-resolve-dependencies';
import { readFileSync } from 'fs';

// Get the root path to our project 
const root = join(dirname(fileURLToPath(import.meta.url)), 'src');

const hasteMapOptions = {
  extensions: ['js'],
  maxWorkers: cpus().length,
  name: 'bundler',
  platforms: [],
  rootDir: root,
  roots: [root],
};
const hasteMap = new JestHasteMap.default(hasteMapOptions);
await hasteMap.setupCachePath(hasteMapOptions);
const { hasteFS, moduleMap } = await hasteMap.build();
console.log(hasteFS.getAllFiles());

const resolver = new Resolver.default(moduleMap, {
  extensions: ['.js'],
  hasCoreModules: false,
  rootDir: root,
});
const dependencyResolver = new DependencyResolver(resolver, hasteFS);

const entryPoint = root + "/index.js"
const allFiles = new Set();
const queue = [entryPoint];

let dependencyMap = {}
let filesContent = []

while (queue.length) {
  const file = queue.shift(); //the first file we process is our entry point
  // Ensure we process each module at most once
  // to guard for cycles.
  if (allFiles.has(file)) {
    continue;
  }

  allFiles.add(file);
  queue.push(...dependencyResolver.resolve(file));
  hasteFS.getDependencies(file).forEach( dep => {
    let fullFilePath = resolver.resolveModule(file, dep)
    let code = readFileSync(fullFilePath, 'utf8')
    let newCode = code;

    let exportMatcher = /(export) /gi
    let match = null;
    do {
      match = exportMatcher.exec(code)
      if(match){ 
        newCode = newCode.replace(match[0], '')
      }
    } while(match != null)

    dependencyMap[dep] = {
      fpath: fullFilePath,
      depName: dep,
      code: newCode
    }

  })
}
console.log("Files processed")
console.log(allFiles)
//console.log("== Dependency Map ==")
//console.log(dependencyMap)

let insertedModules = new Set()

function cleanCode(code, insertedModules, dependencyMap, currentDep, currFile) {
  const importMatcher = /.*import[ ]+.+[ ]+from[ ]+'([a-zA-Z_\.\/]+)'/g

  let matches = null
  let newCode = code;

  do {
    matches = importMatcher.exec(code)

    if(matches != null) {
      if(insertedModules.has(matches[1])) {
        console.log(matches[1], "already inserted")
        newCode = newCode.replace(matches[0], "//--")
      } else {
        newCode = newCode.replace(matches[0], dependencyMap[matches[1]].code)
        console.log(matches[1], "inserted")
        insertedModules.add(matches[1])
      }
    } else {
      let key = currentDep?.depName
      if(insertedModules.has(key)) {
        newCode = "//" + currFile
      }
    }
  } while(matches != null)
  return newCode
}

Array.from(allFiles).reverse().forEach( f => {
  let dep = Object.values(dependencyMap).find( d => d.fpath == f)

  let code = dep?.code
  if(!code) { //it's our entry point
    code = readFileSync(f, 'utf8')
  }

  code = cleanCode(code, insertedModules, dependencyMap, dep, f)
  filesContent.push(code)
})

console.log("=== last clean code ====")
let fullCode = cleanCode(filesContent.join("\n"), insertedModules, dependencyMap, '', '')


console.log("==output ==")
console.log(fullCode)