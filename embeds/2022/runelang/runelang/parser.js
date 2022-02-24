import logging from "../lib/logging.js"
const log = logging.get("parser")

import { EVAL_CONSTANTS, EVAL_FUNCTIONS, EVAL_OPERATORS, EVAL_KEYWORDS } from "./constants.js"

export default function parse(tokens) {
  function parseIdentifier() {
    log.debug("parseIdentifier", tokens[0])

    if (tokens.length === 0) {
      log.error("Parse error, unable to parse identifier, got EOF")
    }

    let identifier = tokens.shift()
    return { type: "identifier", text: identifier.token }
  }

  function parseExpression() {
    let token = tokens[0]
    log.debug("parseExpression", token)

    if (tokens.length === 0) {
      log.error("Parse error, unable to parse expression, got EOF")
    }

    let output = []
    let operator_stack = []

    while (tokens.length > 0) {
      let token = tokens.shift()
      let text = token.token

      log.debug("Parsing expression, token is ", token, ", output is", output, ", operator_stack is", operator_stack)

      if (text[0] === '"') {
        // Literal string
        output.push({ type: "literal", mode: "string", value: text.substring(1, text.length - 1), token })
      } else if (operator_stack.includes("(") && text === ",") {
        // A parameter list
        // TODO: This feels wrong
      } else if (text in EVAL_CONSTANTS) {
        // A constant
        output.push({ type: "literal", mode: "constant", value: EVAL_CONSTANTS[text], token })
      } else if (text in EVAL_FUNCTIONS) {
        // A predefined function
        operator_stack.push(text)
      } else if (text.match(/^\-?[0-9]/)) {
        // Some kind of number

        // Rational
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
      } else if (text == "(") {
        // Parens
        operator_stack.push("(")
      } else if (text == ")") {
        if (operator_stack.includes("(")) {
          // Closing parens
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
              // TODO: Should I be doingEVAL_FUNCTIONS[maybeFunction] this here?
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
      } else if (text in EVAL_OPERATORS) {
        // An operator
        // https://en.wikipedia.org/wiki/Shunting-yard_algorithm

        let precedence = EVAL_OPERATORS[text].precedence
        log.debug(`Working on operator ${text}, precedence is ${precedence}`)

        while (operator_stack.length > 0) {
          let stack_operator = operator_stack[operator_stack.length - 1]
          if (stack_operator == "(") break

          let stack_precedence = EVAL_OPERATORS[stack_operator].precedence

          log.debug(`Stack operator is ${stack_operator}, precedence is ${stack_precedence}`)

          if (stack_precedence < precedence) {
            log.debug(`Done popping, ${stack_precedence} < ${precedence}`)
            break
          }

          output.push({ type: "operator", value: operator_stack.pop() })
        }
        operator_stack.push(text)
      } else if (text[0].match(/[a-zA-Z]/) && !EVAL_KEYWORDS.includes(text)) {
        // A variable
        output.push({ type: "variable", value: text, token })
      } else {
        // Anything else means that we're done parsing the expression
        // Remember to put the token back!
        tokens.unshift(token)
        break
      }
    }
    log.debug("Done parsing expression, output is", output, ", operator_stack is", operator_stack)

    while (operator_stack.length > 0) {
      output.push({ type: "operator", value: operator_stack.pop() })
    }

    let result = { type: "expression", rpn: output, token }

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
    log.debug("parseDefine", tokens[0])

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
        log.error("Parse exception: when defining a modifier, child params must have exactly one argument")
      }
      if (childParams.args[0].asName === undefined) {
        log.error("Parse exception: when defining a modifier, child param must be a single simple argument")
      }
      if (!(childParams === undefined || Object.keys(childParams).length != 0)) {
        log.error("Parse exception: when defining a modifier, child param cannot have a default value")
      }
    }

    if (tokens.length > 0 && tokens[0].token == "[") {
      if (mode === "modifier") {
        log.error("Parse exception: when defining a modifier, cannot define a list param")
      }

      list = parseList()
      mode = "stacker"
    }

    if (tokens.length > 0 && tokens[0].token == "{") {
      body = parseGroup()
    } else {
      log.error("Parse exception: during defines, the body must be a group with {}")
    }

    let result = { type: "define", mode, identifier, token }

    if (params !== null) result.params = params
    if (childParams !== null) result.child = childParams.args[0].asName
    if (list !== null) result.list = list
    if (body !== null) result.body = body

    return result
  }

  function parseParams() {
    log.debug("parseParams", tokens[0])

    let token = tokens.shift()

    let args = []
    let kwargs = {}

    if (tokens.length === 0) {
      log.error("Parse error, unterminated params at", token, "")
    }

    let parsingKwargs = false
    while (true) {
      if (tokens.length === 0) {
        log.error("Parse error, unterminated params at", token, ", expected ) got EOF")
      } else if (tokens[0].token === ")") {
        tokens.shift()
        return { type: "params", args, kwargs, token }
      }

      let identifier = parseExpression()

      if (tokens.length === 0) {
        log.error("Parse error, unterminated params at", token, ", expected , or : got EOF")
      } else if (parsingKwargs && tokens[0].token === ",") {
        log.error("Parse error, invalid params at", token, ", args cannot come after kwargs, expected : got ,")
      }

      // Parsing a kwarg (key:value)
      if (tokens[0].token === ":") {
        tokens.shift()
        parsingKwargs = true

        if (!identifier.asName) {
          log.error("Parse error, kwargs key must be an identifier at", token, ", got", identifier, "")
        }

        if (tokens.length === 0) {
          log.error("Parse error, unterminated params at", token, ", missing kwarg body at", key, "")
        }

        let value = parseExpression()

        if (identifier.asName in kwargs) {
          log.error("Parse error, duplicate kwarg at", token, "when parsing", identifier.asName, "")
        }

        args.push(identifier)
        kwargs[identifier.asName] = value
      } else {
        args.push(identifier)
      }

      if (tokens[0].token === ",") {
        tokens.shift()
      }
    }
  }

  function parseList() {
    log.debug("parseList", tokens[0])

    let token = tokens.shift()
    let nodes = []

    // Lists can be:
    // literal-list:    [ <body:node>* ]
    // for-list:        [ <body:node>* for <variable:identifier> in <expression:iterable> ]
    // times-list:      [ <body:node>* times <variable:integer> ]

    while (true) {
      if (tokens.length === 0) {
        log.error("Parse error, unterminated list", token, "")
      }

      if (tokens[0].token === "]") {
        tokens.shift()
        return { type: "list", mode: "literal", nodes, token }
      }

      // Finish processing a for list
      if (tokens[0].token === "for") {
        log.debug("parseList - found for")
        tokens.shift() // for
        let variable = parseIdentifier()
        log.debug("parseList - found for - variable is", variable)

        if (tokens.length === 0) {
          log.error("Parse error, unterminated for-list at", token, "")
        } else if (tokens[0].token !== "in") {
          log.error("Parse error, invalid for-list at", token, ', expected "in", got', tokens[0], "")
        }
        tokens.shift() // in

        let expression = parseExpression()
        log.debug("parseList - found for - expression is", expression)

        if (tokens.length === 0) {
          log.error("Parse error, unterminated for-list at", token, "")
        } else if (tokens[0].token != "]") {
          log.error("Parse error, unterminated for-list at", token, ', expected "]", got', tokens[0], "")
        }

        tokens.shift()
        return { type: "list", mode: "for", body: { type: "group", nodes }, variable, expression, token }
      }

      // Finish processing a times list
      if (tokens[0].token === "times") {
        tokens.shift()
        let body = nodes[0]
        let expression = parseExpression()

        if (tokens.length === 0) {
          log.error("Parse error, unterminated times-list at", token, "")
        } else if (tokens[0].token != "]") {
          log.error("Parse error, unterminated times-list at", token, ', expected "]", got', tokens[0], "")
        }

        tokens.shift()
        return { type: "list", mode: "times", body: { type: "group", nodes }, expression, token }
      }

      // Otherwise, build up more nodes or groups
      if (tokens[0].token === "{") {
        nodes.push(parseGroup())
      } else if (tokens[0].token === "define") {
        nodes.push(parseDefine())
      } else {
        nodes.push(parseNode())
      }

      if (nodes.length >= 2) {
        nodes[nodes.length - 2].next = nodes[nodes.length - 1]
      }
    }
  }

  function parseGroup(terminator = "}") {
    log.debug("parseGroup", tokens[0])

    let token = tokens.shift()
    let nodes = []

    while (true) {
      if (tokens.length === 0) {
        log.error("Parse error, unterminated group", token, "")
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
  tokens.unshift({ token: "{" })
  tokens.push({ token: "}" })

  return parseGroup()
}
