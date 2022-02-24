import logging from "../lib/logging.js"
const log = logging.get("evaluator")

import { EVAL_CONSTANTS, EVAL_FUNCTIONS, EVAL_OPERATORS, GLOBALS } from "./constants.js"
//import { include } from "./main.js"

class Environment {
  constructor(parent = null) {
    this.parent = parent
    this.data = {}
  }

  set(key, value) {
    this.data[key] = value
  }

  get(key) {
    if (key in this.data) {
      return this.data[key]
    }

    if (this.parent) {
      return this.parent.get(key)
    }
  }

  extend() {
    return new Environment(this)
  }
}

class Callable {
  constructor(f) {
    if (f === undefined) return

    this.f = f
    this.defaults = []

    let match = f.toString().match(/\((.*?)\)/)
    if (match === null) {
      log.error("Runtime error: could not find params in", f.toString())
    }

    for (let arg of match[1].split(",")) {
      if (arg.includes("=")) {
        let [key, def] = arg.split("=")
        this.defaults.push([key.trim(), def.trim()])
      } else {
        this.defaults.push([arg.trim(), undefined])
      }
    }
  }

  call(params, environment) {
    // this.defaults comes from the definition of the function

    // params comes from the call
    //    params might contain zero, one, or both of args and kwargs
    //    params duplicates args in both args and kwargs, if it's in both it's passed as a kwarg

    // argsToCall is what we'll send to the internal function with apply

    let args = params?.args
    let kwargs = params?.kwargs

    let passedArgsCount = 0
    if (args) passedArgsCount += args.length
    if (kwargs) passedArgsCount -= Object.keys(kwargs).length

    let argsToCall = []
    for (let i = 0; i < this.defaults.length; i++) {
      let [name, defaultValue] = this.defaults[i]

      // Try to get each value from args, kwargs, then default

      if (args && i < passedArgsCount) {
        if (kwargs && args[i].asName && args[i].asName in kwargs) {
          argsToCall.push(evaluate(kwargs[args[i].asName], environment))
        } else {
          argsToCall.push(evaluate(args[i], environment))
        }
      } else if (kwargs && name in kwargs) {
        argsToCall.push(evaluate(kwargs[name], environment))
      } else {
        argsToCall.push(defaultValue)
      }
    }
    return this.f.apply(this, argsToCall)
  }
}

function evaluateGroup(node, environment) {
  let children = []
  for (let child of node.nodes) {
    let result = evaluate(child, environment)
    if (result !== null) children.push(result)
  }
  return children.join("")
}

function evaluateDefine(node, environment) {
  let name = node.identifier.text
  if (environment.get(name)) {
    log.error(`Runtime error: unable to redefine ${name}`)
  }

  let defaults = []
  if (node.params) {
    for (var i = 0; i < node.params.args.length; i++) {
      let name = node.params.args[i].asName
      if (!name) {
        log.error(`Runtime error: unable to define ${name}, parameter`, node.params.args[i], "is missing a name")
      }

      // This will be undefined if no default is set, this is fine
      let def = evaluate(node.params.kwargs[name], environment)
      defaults.push([name, def])
    }
  }

  let definedFunction

  if (node.mode === "terminal") {
    // Create the new function for the callable object
    definedFunction = (...args) => {
      // Bind passed variables into the local environment
      let definedEnvironment = environment.extend()
      for (let i = 0; i < defaults.length; i++) {
        let [key, def] = defaults[i]
        let value = args[i]
        if (value === undefined) value = def
        definedEnvironment.set(key, value)
      }

      // Call the body (a single group) with those args/kwargs
      return evaluate(node.body, definedEnvironment)
    }
  } else if (node.mode === "modifier") {
    // Create the new function for the callable object
    definedFunction =
      (...args) =>
      (child) => {
        // Bind passed variables into the local environment
        let definedEnvironment = environment.extend()
        for (let i = 0; i < defaults.length; i++) {
          let [key, def] = defaults[i]
          let value = args[i]
          if (value === undefined) value = def
          definedEnvironment.set(key, value)
        }

        definedEnvironment.set(node.child, child)

        // Call the body (a single group) with those args/kwargs
        return evaluate(node.body, definedEnvironment)
      }
  } else if (node.mode === "stacker") {
    throw "define stacker not implemented"
  } else {
    log.error(`Runtime error: unknown define mode ${node.mode}`)
  }

  log.debug(`Created a new function ${name} of type ${node.mode} with defaults = ${defaults}`)

  let callable = new Callable()
  callable.defaults = defaults
  callable.f = definedFunction

  let obj = { type: node.mode, value: callable }

  environment.set(name, obj)
}

function evaluateTerminalNode(object, node, environment) {
  if (node.body) {
    log.error("Runtime exception: terminal", node, "should not have a body")
  }

  if (node.group) {
    log.error("Runtime exception: terminal", node, "should not have a group")
  }

  return object.value.call(node.params, environment)
}

function evaluateModifierNode(object, node, environment) {
  // If we have a group evaluate it as child, otherwise take the next node
  let child = null,
    asNext = false
  if (node.body) {
    if (node.body.type !== "group") {
      log.error("Runtime exception: modifiers can only modify groups at", node, "")
    }

    child = node.body
  } else if (node.next) {
    child = node.next
    asNext = true
    node.next.evaluated = true
  } else {
    log.error("Runtime exception: modifiers must have a following group or node at", node, "")
  }

  child.eval = (env = null) => evaluate(child, env || environment, asNext)

  return object.value.call(node.params, environment)(child)
}

function evaluateStackerNode(object, node, environment) {
  // Stackers apply to the following list
  if (!node.list || node.body) {
    log.error("Runtime exception: stackers can only modify lists at", node, "")
  }

  let children = evaluate(node.list, environment)
  return object.value.call(node.params, environment)(children)
}

function evaluateNode(node, environment) {
  /* Special case for includes */
  // TODO: Better error handling
  if (node.identifier.text === "include") {
    let path = evaluate(node.params.args[0], environment)
    return include(path, environment)
  }

  let object = environment.get(node.identifier.text)
  if (!object) {
    log.error(`Runtime exception: object ${node.identifier.text} is not defined`)
  }

  if (object.type === "terminal") {
    return evaluateTerminalNode(object, node, environment)
  } else if (object.type == "modifier") {
    return evaluateModifierNode(object, node, environment)
  } else if (object.type == "stacker") {
    return evaluateStackerNode(object, node, environment)
  } else if (object.type == "group") {
    return evaluateGroup(object, environment)
  } else {
    log.error("Runtime exception: unknown object type in", object, "")
  }
}

function evaluateList(node, environment) {
  if (node.mode === "literal") {
    let result = []
    for (let childNode of node.nodes) {
      result.push(evaluate(childNode, environment))
    }
    return result
  } else if (node.mode === "for") {
    if (node.variable.type !== "identifier") {
      log.error("Runtime exception: for-list variable must be an identifier, got", node.variable)
    }

    let variable = node.variable.text
    let iterable = evaluate(node.expression, environment)
    let forEnvironment = environment.extend()

    log.debug("In for-loop, iterable is", iterable)

    let result = []
    for (let eachValue of iterable) {
      log.debug(`In for-loop, setting ${variable} to ${eachValue}`)
      forEnvironment.set(variable, eachValue)
      result.push(evaluate(node.body, forEnvironment))
    }
    return result
  } else if (node.mode === "times") {
    let times = evaluate(node.expression, environment)
    if (typeof times !== "number") {
      log.error("Runtime exception: times-list must be a number, got", times)
    }

    let result = []
    for (var i = 0; i < times; i++) {
      result.push(evaluate(node.body, environment))
    }
    return result
  } else {
    log.error(`Runtime error: unknown list mode ${node.mode}`)
  }
}

function evaluateParams(node, environment) {
  let kwargs = {}
  if (node.kwargs) {
    for (let key in node.kwargs) {
      let value = evaluate(node.kwargs[key], environment)
      kwargs[key] = value
    }
  }

  let args = []
  for (let arg of node.args) {
    if (arg.asName && arg.asName in kwargs) {
      args.push(kwargs[arg.asName])
    } else {
      args.push(evaluate(arg, environment))
    }
  }

  return { args, kwargs }
}

function evaluateExpression(node, environment) {
  log.debug("Evaluating expression RPN:", node.rpn)

  let stack = []
  for (let el of node.rpn) {
    log.debug("Node is", el, "stack is", stack)

    if (el.type === "literal") {
      stack.push(el.value)
    } else if (el.type === "operator") {
      if (stack.length < 2) {
        log.error("Runtime exception: tried to evaluate", el, "but needed two parameters")
      }

      let right = stack.pop()
      let left = stack.pop()
      let f = EVAL_OPERATORS[el.value].f
      stack.push(f(left, right))
    } else if (el.type === "variable") {
      let key = el.value
      let value = environment.get(el.value)

      if (value !== undefined && value !== null) {
        stack.push(value)
      } else {
        log.error("Runtime exception: failed to evaluate variable", key, ", not defined")
      }
    } else if (el.type === "function") {
      let args = []
      for (var i = 0; i < el.arity; i++) {
        args.unshift(stack.pop())
      }
      let result = el.value.apply(null, args)
      stack.push(result)
    } else {
      log.error("Runtime exception: failed to evaluate RPN", el, ", unknown type")
    }
  }

  if (stack.length !== 1) {
    log.error("Runtime exception: expressions must result in exactly one value, got", stack, "")
  }

  return stack[0]
}

const IDGenerator = (function* id() {
  let i = 0
  while (true) {
    yield i
    i += 1
  }
})()

export default function evaluate(node, environment = null, asNext = false) {
  let id = IDGenerator.next().value

  // Construct base environment
  if (environment === null) {
    log.debug("Building base environment")
    environment = new Environment()
    for (let type in GLOBALS) {
      for (let name in GLOBALS[type]) {
        log.debug(`Loading global ${type}.${name}:\n---\n${GLOBALS[type][name].toString()}\n---`)
        environment.set(name, { type, value: new Callable(GLOBALS[type][name]) })
        log.debug("Resulting callable:", environment.get(name))
      }
    }
    environment = environment.extend()
    log.debug("Finished building base environment")
  }

  if (node === undefined || node === null) return null

  // We've already evaluated this node (for example as a .next)
  if (node.evaluated && !asNext) {
    log.debug("Skipping evaluation of", node, "already evaluated")
    return null
  } else {
    let formatNode = (node) => {
      return JSON.stringify(node, (k, v) => (["body"].includes(k) ? "<removed>" : v))
    }

    let formatEnvironment = (environment) => {
      if (environment.parent === null) {
        return `<GLOBAL>`
      } else {
        return `<${JSON.stringify(environment.data)} extends ${formatEnvironment(environment.parent)}>`
      }
    }

    log.info(`[${id}] Evaluating ${formatNode(node)} in ${formatEnvironment(environment)}`)
  }

  let result

  // Evaluate a node group by evaluating each and concating results
  if (node.type === "group") {
    result = evaluateGroup(node, environment)
  }

  // Define a new callable in the environment
  else if (node.type === "define") {
    result = evaluateDefine(node, environment)
  }

  // Get the value for a node type
  else if (node.type === "node") {
    result = evaluateNode(node, environment)
  }

  // A parameter list
  else if (node.type === "params") {
    result = evaluateParams(node, environment)
  }

  // An expression
  else if (node.type === "expression") {
    result = evaluateExpression(node, environment)
  }

  // Different kinds of lists
  else if (node.type === "list") {
    result = evaluateList(node, environment)
  }

  // Get the value for a parameter list
  else {
    log.error("Runtime error, unknown node type to evaluate in", node, "")
  }

  log.info(`[${id}] Returning`, result)
  return result
}
