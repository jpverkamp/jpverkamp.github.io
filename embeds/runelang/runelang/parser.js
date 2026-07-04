import logging from "../lib/logging.js"
const log = logging.get("parser")

import { EVAL_CONSTANTS, EVAL_FUNCTIONS, EVAL_OPERATORS, EVAL_KEYWORDS } from "./constants.js"

export default function parse(tokens) {
  function parseIdentifier() {
    log.debug("parseIdentifier", tokens[0])

    if (tokens.length === 0) {
      log.error(`Unable to parse identifier, got EOF`, token, token)
    }

    let identifier = tokens.shift()
    return { type: "identifier", text: identifier.token }
  }

  function parseExpression() {
    let token = tokens[0]
    log.debug("parseExpression", token)

    if (tokens.length === 0) {
      log.error("unable to parse expression, got EOF")
    }

    // Parse using the [Shunting-Yard algorithm](https://en.wikipedia.org/wiki/Shunting-yard_algorithm)
    let output = []
    let operator_stack = []

    // Loop through tokens until we hit a token that can't be part of the expression
    while (tokens.length > 0) {
      let token = tokens.shift()
      let text = token.token

      // Literal string
      if (text[0] === '"') {
        output.push({ type: "literal", mode: "string", value: text.substring(1, text.length - 1), token })
      }
      // A parameter list
      else if (operator_stack.includes("(") && text === ",") {
      }
      // A constant
      else if (text in EVAL_CONSTANTS) {
        output.push({ type: "literal", mode: "constant", value: EVAL_CONSTANTS[text], token })
      }
      // A predefined function
      else if (text in EVAL_FUNCTIONS) {
        operator_stack.push(text)
      }
      // Some kind of number
      else if (text.match(/^\-?[0-9]/)) {
        // Rational numbers/fractions
        // TODO: Divided by zero error
        if (text.match(/\//)) {
          let [num, den] = text.split("/")
          let value = (1.0 * parseInt(num)) / parseInt(den)

          output.push({ type: "literal", mode: "number", value, token })
        }
        // Decimal
        else if (text.match(/\./)) {
          output.push({ type: "literal", mode: "number", value: parseFloat(text), token })
        }
        // Hexadecimal
        else if (text.match(/^0x/)) {
          output.push({ type: "literal", mode: "number", value: parseInt(text.substring(2), 16) })
        }
        // Degrees (stored internally angles 0-1 for a circle)
        else if (text.match(/\-?\d+deg/)) {
          output.push({ type: "literal", mode: "number", unit: "degrees", value: parseInt(text.substring(0, text.length - 3)) / 360, token })
        }
        // Radians (stored internally angles 0-1 for a circle)
        else if (text.match(/\-?\d+rad/)) {
          output.push({ type: "literal", mode: "number", unit: "radians", value: parseInt(text.substring(0, text.length - 3)) / (2 * Math.PI), token })
        }
        // Anything else should be an integer
        else {
          output.push({ type: "literal", mode: "number", value: parseInt(text), token })
        }
      }
      // Parens, either a function call or grouping
      else if (text == "(") {
        operator_stack.push("(")
      }
      // Closing parens
      else if (text == ")") {
        if (operator_stack.includes("(")) {
          while (true) {
            let token = operator_stack.pop()
            if (token === "(") {
              break
            } else {
              output.push(token)
            }
          }

          if (operator_stack.length > 0) {
            let maybeFunction = operator_stack.pop()
            if (maybeFunction in EVAL_FUNCTIONS) {
              let f = EVAL_FUNCTIONS[maybeFunction]
              let arity = f
                .toString()
                .match(/\(.*?\)/)[0]
                .split(",").length

              output.push({ type: "function", value: f, arity, token })
            } else {
              operator_stack.push(maybeFunction)
            }
          }
        } else {
          // No ( on the stack means this is finishing the expression
          tokens.unshift(token)
          break
        }
      }
      // An operator
      // https://en.wikipedia.org/wiki/Shunting-yard_algorithm
      else if (text in EVAL_OPERATORS) {
        let precedence = EVAL_OPERATORS[text].precedence
        log.debug(`Working on operator`, token, { text, precedence })

        while (operator_stack.length > 0) {
          let stack_operator = operator_stack[operator_stack.length - 1]
          if (stack_operator == "(") break

          let stack_precedence = EVAL_OPERATORS[stack_operator].precedence

          log.debug(`Continuing operator`, token, { stack_operator, stack_precedence })

          if (stack_precedence < precedence) {
            log.debug(`Done popping`, token, { stack_precedence, precedence })
            break
          }

          output.push({ type: "operator", value: operator_stack.pop() })
        }
        operator_stack.push(text)
      }
      // A variable
      else if (text[0].match(/[a-zA-Z]/) && !EVAL_KEYWORDS.includes(text)) {
        output.push({ type: "variable", value: text, token })
      }
      // Anything else means that we're done parsing the expression
      // Remember to put the token back!
      else {
        tokens.unshift(token)
        break
      }
    }
    log.debug(`Done parsing expression`, token, { output, operator_stack })

    // After we exit the list, any remaining operators get added to the stack
    while (operator_stack.length > 0) {
      output.push({ type: "operator", value: operator_stack.pop() })
    }

    // Construct the result value
    let result = { type: "expression", rpn: output, token }

    // Special case: if the expression was a single identifier
    // It's probably being used as a variable name in a param/kwarg, store an alias for this
    if (output.length === 1 && output[0].type === "variable") {
      result.asName = output[0].value
    }

    return result
  }

  function parseNode() {
    let token = tokens[0]
    log.debug("parseNode", token)

    let identifier = parseIdentifier()
    let params = null,
      list = null,
      body = null

    // Nodes have an identifier and then optionally a param list, list body, and group body (in that order)

    if (tokens.length > 0 && tokens[0].token == "(") {
      params = parseParams()
    }

    if (tokens.length > 0 && tokens[0].token == "[") {
      list = parseList()
    }

    if (tokens.length > 0 && tokens[0].token == "{") {
      body = parseGroup()
    }

    let result = { type: "node", identifier, token }

    if (params !== null) result.params = params
    if (list !== null) result.list = list
    if (body !== null) result.body = body

    return result
  }

  function parseDefine() {
    let token = tokens[0]
    tokens.shift()
    log.debug("parseDefine", token)

    let identifier = parseIdentifier()
    let params = null,
      childParams = null,
      list = null,
      body = null,
      mode = "terminal"

    // Define nodes can have three different syntaxes depending on which kind they are:
    // define <identifier> ( <params> ) { <body> } - defines a terminal, params are optional
    // define <identifier> ( <params> ) ( <child> ) { <body> } - defines a modifier, params are not optional
    //    child param must be exactly one element without a default
    // define <identifier> ( <params> ) [ <list> ] { <body> } - defines a stacker, params are optional

    if (tokens.length > 0 && tokens[0].token == "(") {
      params = parseParams()
    }

    if (tokens.length > 0 && tokens[0].token == "(") {
      childParams = parseParams()
      mode = "modifier"

      if (childParams.args.length != 1) {
        log.error("when defining a modifier, child params must have exactly one argument", token)
      }
      if (childParams.args[0].asName === undefined) {
        log.error("when defining a modifier, child param must be a single simple argument", token)
      }
      if (!(childParams === undefined || Object.keys(childParams).length != 0)) {
        log.error("when defining a modifier, child param cannot have a default value", token)
      }
    }

    if (tokens.length > 0 && tokens[0].token == "[") {
      if (mode === "modifier") {
        log.error("when defining a modifier, cannot define a list param", token)
      }

      list = parseList()
      mode = "stacker"
    }

    if (tokens.length > 0 && tokens[0].token == "{") {
      body = parseGroup()
    } else {
      log.error("during defines, the body must be a group with {}", token)
    }

    let result = { type: "define", mode, identifier, token }

    if (params !== null) result.params = params
    if (childParams !== null) result.child = childParams.args[0].asName
    if (list !== null) result.list = list
    if (body !== null) result.body = body

    return result
  }

  function parseParams() {
    // Consume the leading (
    let token = tokens.shift()
    log.debug("parseParams", token)

    let args = []
    let kwargs = {}

    // Start by parsing args (not kwargs) until we see a kwarg (with a `:`)
    let parsingKwargs = false
    while (true) {
      // Failure state: no closing )
      if (tokens.length === 0) {
        log.error("unterminated params", token, { expected: ")", got: "EOF" })
      }
      // End state: closing ), consume it and return the parsed params
      else if (tokens[0].token === ")") {
        tokens.shift()
        return { type: "params", args, kwargs, token }
      }

      // Parse the first part of the expression:
      // * When in a define, this should always be a single name
      // * When in a call as an arg, this can be a name or a complicated expression
      // * When in a kwarg, this is always a name
      let identifier = parseExpression()

      // Failure states: ran out of input or we've started parsing kwargs and got a , (should be a :)
      if (tokens.length === 0) {
        log.error("unterminated params, expected , or : got EOF", token)
      } else if (parsingKwargs && tokens[0].token === ",") {
        log.error("args cannot come after kwargs", token, { expected: ";", got: "," })
      }

      // If the next token is a : switch to kwargs mode and parse the value of the key/value pair
      if (tokens[0].token === ":") {
        tokens.shift()
        parsingKwargs = true

        // This is where we check the above case that for kwargs the left side of the `:` must just be a name
        // .asName is populated by `parseExpression`, when it returns a single identifier it will be filled
        if (!identifier.asName) {
          log.error("kwargs key must be an identifier", token, { expected: "identifer", got: token })
        }

        // Parsing kwargs and ran out of input
        if (tokens.length === 0) {
          log.error("missing kwargs body", key)
        }

        // Parsing the value
        let value = parseExpression()

        // Cannot have duplicate values in kwargs (we'll check that there are no duplicates in args at runtime)
        if (identifier.asName in kwargs) {
          log.error("duplicate kwarg", token, { name: identifier.asName })
        }

        // All kwargs are also positional `args`, store the new arg in both places here
        args.push(identifier)
        kwargs[identifier.asName] = value
      }
      // A regular arg, not a kwarg, just store it
      else {
        args.push(identifier)
      }

      // If the next argument is a `,` we're still parsing the list
      // If it's ) we'll catch the end of the list at the top of the loop
      // If it's anything else, we have malformed input (this previously caused an infinite loop)
      if (tokens[0].token === ",") {
        tokens.shift()
      } else if (tokens[0].token === ")") {
        continue
      } else {
        log.error("badly formed parameters", token, { expected: [",", ")"], got: tokens[0] })
      }
    }
  }

  function parseList() {
    // Consume the opening [
    let token = tokens.shift()
    log.debug("parseList", token)

    let nodes = []

    // Lists can be:
    // literal-list:    [ <nodes:node>* ]
    // for-list:        [ <nodes:node>* for <variable:identifier> in <expression:iterable> ]
    // times-list:      [ <nodes:node>* times <variable:integer> ]

    while (true) {
      // Error state: never saw a closing ]
      if (tokens.length === 0) {
        log.error("unterminated list", token)
      }

      // Saw a ] before seeing for or times (see below), this must have been a literal list
      if (tokens[0].token === "]") {
        tokens.shift()
        return { type: "list", mode: "literal", nodes, token }
      }

      // If we see the `for` keyword, then we're parsing a `for` special form
      // [ <nodes:node>* for <variable:identifier> in <expression:iterable> ]
      if (tokens[0].token === "for") {
        // Consume the for and parse what the variable we're looping over is
        tokens.shift()
        let variable = parseIdentifier()

        // Error states: no more input or no 'in' keyword after the variable name
        if (tokens.length === 0) {
          log.error("unterminated for-list", token)
        } else if (tokens[0].token !== "in") {
          log.error("invalid for-list", token, { expected: "in", got: tokens[0] })
        }
        tokens.shift() // in

        // The expression should return any iterable object (we're fuzzy on times)
        // We only check this at runtime, for now, just parse an expression
        let expression = parseExpression()

        // The for list is done, make sure that we have a closing ]
        if (tokens.length === 0) {
          log.error("unterminated for-list", token)
        } else if (tokens[0].token != "]") {
          log.error("unterminated for-list", token, { expected: "]", got: tokens[0] })
        }

        // Consume the closing ] and return the `list` with mode `for`
        tokens.shift()
        return { type: "list", mode: "for", body: { type: "group", nodes }, variable, expression, token }
      }

      // If we see the `times` keyword, then we're parsing the `times` special form
      // [ <nodes:node>* times <variable:integer> ]
      if (tokens[0].token === "times") {
        // Consume the times
        tokens.shift()

        // Parse an expression, this should evaluate to a numeric value but we'll deal with that at runtime
        let expression = parseExpression()

        // That's everything for a times list, so make sure we have a closing ]
        if (tokens.length === 0) {
          log.error("unterminated times-list", token)
        } else if (tokens[0].token != "]") {
          log.error("unterminated times-list", token, { expected: "]", got: tokens[0] })
        }

        // Consume the closing ] and return the `times` `list`
        tokens.shift()
        return { type: "list", mode: "times", body: { type: "group", nodes }, expression, token }
      }

      // Otherwise we don't know what kind of list it is yet
      // But for all three cases, we will build up more nodes or groups
      // The next token ({, define, or anything else) defines what sort of child we're parsing next
      if (tokens[0].token === "{") {
        nodes.push(parseGroup())
      } else if (tokens[0].token === "define") {
        nodes.push(parseDefine())
      } else {
        nodes.push(parseNode())
      }

      // As we do in groups, apply the `.next` parameter
      if (nodes.length >= 2) {
        nodes[nodes.length - 2].next = nodes[nodes.length - 1]
      }
    }
  }

  function parseGroup(terminator = "}") {
    let token = tokens.shift()
    log.debug("parseGroup", token)

    let nodes = []

    while (true) {
      if (tokens.length === 0) {
        console.log(token)
        log.error("unterminated group", token)
      }

      if (tokens[0].token === "}") {
        tokens.shift()
        return { type: "group", nodes, token }
      }

      if (tokens[0].token === "define") {
        nodes.push(parseDefine())
      } else {
        nodes.push(parseNode())
      }

      if (nodes.length >= 2) {
        nodes[nodes.length - 2].next = nodes[nodes.length - 1]
      }
    }
  }

  // Implicitly add a group
  tokens.unshift({ token: "{", row: 0, col: 0 })
  tokens.push({ token: "}", row: 0, col: 0 })

  return parseGroup()
}
