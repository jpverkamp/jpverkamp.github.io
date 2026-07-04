const INDENTATION_STRING = "  "
let INDENTATION_LEVEL = 0

function stdlib() {
  console.log(`
define bar { translate(x: 0.5) rotate(0.25) line }

define fork(n) {
  translate(x: 0.5) rotate(0.25) {
    line
    linear [
      rotate(0.25) translate(y: -0.5) scale(0.5) line
      times n
    ]
  }
}

define doubleTextCircle(set) {
  double(0.1) circle
  stroke(weight: 1, color:"none") fill("black") invert text(chooseOne(set))
}

  `)
}

function block(text) {
  line(text)
  INDENTATION_LEVEL++
}

function end_block(text) {
  INDENTATION_LEVEL--
  line(text)
}

function random_float(min, max) {
  min ||= 0.0
  max ||= 1.0

  return Math.random() * (max - min) + min
}

function random_int(min, max) {
  if (!max) {
    max = min
    min = 0
  }

  return Math.floor(Math.random() * (1 + max - min)) + min
}

function choose(...options) {
  let weights = []
  let total_options = 1

  for (let i = 0; i < options.length; i++) {
    if (Number.isInteger(options[i])) {
      weights.push([options[i], options[i + 1]])
      total_options += options[i]
      i += 1
    } else {
      weights.push([1, options[i]])
      total_options += 1
    }
  }

  let value = random_int(0, total_options - 1)
  for (let [weight, option] of weights) {
    if (value <= weight) {
      if (option instanceof Function) {
        return option()
      } else {
        return option
      }
    } else {
      value -= weight
    }
  }
  console.error("out of range choice)")
}

function line(text) {
  console.log(INDENTATION_STRING.repeat(INDENTATION_LEVEL) + text)
}

function generate_rune() {
  stdlib()
  block("rune {")
  // choose(generate_constellation, generate_summoning_circle, generate_bind_rune)
  choose(generate_bind_rune)
  // choose(generate_summoning_circle)
  end_block("}")
}

function generate_constellation() {}

function generate_summoning_circle(depth, options) {
  let LANGUAGES = ["GREEK_UPPER", "ASTROLOGICAL", "RUNIC"]

  options ||= {}
  depth ||= 0
  block("group {")

  let border_text_chance = options["border_text_chance"] || 0.5
  let star_chance = depth == 0 ? 1.0 : options["star_chance"] || 0.5
  let second_star_chance = depth == 0 ? 1.0 : options["second_star_chance"] || 0.5
  let border_recur_chance = options["border_recur_chance"] || 0.5 ** depth
  let inner_recur_chance = options["inner_recur_chance"] || 0.5 ** depth
  let inner_text_chance = options["inner_text_chance"] || 0.5 // if not inner recur

  // Border
  if (random_float() < border_text_chance) {
    line(`doubleTextCircle(${choose(...LANGUAGES)})`)
  } else {
    r
    line("double(0.1) circle")
  }

  // Stars
  if (random_float() < star_chance) {
    let points = [5, 7, 11, 13][random_int(0, 3)]
    line(`star(${points})`)

    if (random_float() < second_star_chance) {
      let points = [5, 7, 11, 13][random_int(0, 3)]
      line(`invert star(${points})`)
    }
  }

  // Outer circles
  if (random_float() < border_recur_chance) {
    let points = [5, 7, 11, 13][random_int(0, 3)]
    if (depth <= random_int(1, 3)) {
      block("radial(scale: 1/4) [")
      for (let i = 0; i < points; i++) {
        generate_summoning_circle(depth + 1)
      }
      end_block("]")
    }
  }

  // Inscribed circles
  if (random_float() < inner_recur_chance) {
    block("scale(0.5) {")
    generate_summoning_circle(depth + 1)
    end_block("}")
  } else if (random_float() < inner_text_chance) {
    line(`text(chooseOne(${choose(...LANGUAGES)}))`)
  }

  end_block("}")
}

function generate_bind_rune() {
  block("stroke(weight: 5) scale(0.75) {")
  block("radial(offset: 0) [")
  {
    for (let i = 0; i < random_int(2, 4) * 2; i++) {
      generate_bind_rune_arm()
    }
  }

  end_block("]")
  end_block("}")
}

function generate_bind_rune_arm() {
  block("stack [")
  line("line")
  block("linear(scale: 0.25, min: 0.5) [")
  {
    for (let i = 0; i < random_int(2, 5); i++) {
      choose(
        // cross bar
        8,
        () => line("bar"),
        // half circle in
        2,
        () => line("group { translate(y: -0.25) scale(0.5) arc(-1/4, 1/4) }"),
        // half circle out
        2,
        () => line("group { translate(y: 0.25) scale(0.5) arc(1/4, -1/4) }"),
        // full circle
        1,
        () => line('scale(0.25) fill("none") circle'),
        // two dots
        1,
        () => {
          block('fill("black") stack [')
          line("{ translate(-0.5) scale(0.1) circle }")
          line("{ translate(0.5) scale(0.1) circle }")
          end_block("]")
        }
      )
    }
    line(`fork(${random_int(3, 5)})`)
  }
  end_block("]")
  end_block("]")
}

// main
generate_rune()
