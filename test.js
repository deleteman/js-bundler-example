//--
//--

function myFunction() {
    return "this is my function"
}


function secondaryFunction() {
    return {
        name: NAME,
        id: 123
    }
}

function anotherFunction() {
    return concat(NAME, COUNTRY)
}

const NAME = "FERNANDO DOGLIO"
const COUNTRY = "SPAIN"

function concat(a, b) {
    return [a, b].join(" ")
}

///Users/fernandodoglio/workspace/bundler/src/functions.js
///Users/fernandodoglio/workspace/bundler/src/constants.js

//--
//--


console.log(myFunction())
console.log("Name: ", NAME)
console.log("Country: ", COUNTRY)
console.log(anotherFunction())