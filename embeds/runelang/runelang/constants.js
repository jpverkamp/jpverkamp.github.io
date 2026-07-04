const TOKEN_PATTERNS = [
  /^[\(\)\[\]\{\}]/, // Brackets
  /^,/, // Commas
  /^:/, // Colons
  /^(false|true)/, // Booleans
  /^0x[0-9a-fA-F]+/, // Hexadecimal literals
  /^\-?\d+\/\d+/, // Fractions
  /^\-?\d+\.\d+/, // Decimals
  /^\-?\d+(deg|rad)/, // Angles with units
  /^\-?\d+/, // Integers
  /^[a-zA-Z][a-zA-Z0-9_-]*/, // Words
  /^(\.\.|\+|\-|\/|\*)/, // Operators
  /^"([^\\"]|\\.)*"/, // Strings (with escaping)
]

// Keywords only matter in expressions / cannot be used as variables
const EVAL_KEYWORDS = ["for", "in", "times"]

// Operators sorted by precedence
const EVAL_OPERATORS = {
  "*": {
    precedence: 3,
    f: function (x, y) {
      return x * y
    },
  },
  "/": {
    precedence: 3,
    f: function (x, y) {
      return x / y
    },
  },
  "+": {
    precedence: 2,
    f: function (x, y) {
      return x + y
    },
  },
  "-": {
    precedence: 2,
    f: function (x, y) {
      return x - y
    },
  },
  "..": {
    precedence: 1,
    f: function (x, y) {
      let range = []
      for (let i = x; i <= y; i++) {
        range.push(i)
      }
      return range
    },
  },
}

function characterRange(start, end) {
  let lo = start.charCodeAt(0)
  let hi = end.charCodeAt(0)

  let list = []

  for (var i = lo; i <= hi; i++) {
    list.push(String.fromCodePoint(i))
  }

  return list.join("")
}

const EVAL_CONSTANTS = {
  false: false,
  true: true,
  GREEK_LOWER: characterRange("α", "ω"),
  GREEK_UPPER: characterRange("Α", "Ω"),
  GREEK: [...characterRange("α", "ω"), ...characterRange("Α", "Ω")],
  CYRILLIC_LOWER: characterRange("а", "я"),
  CYRILLIC_UPPER: characterRange("А", "Я"),
  CYRILLIC: [...characterRange("а", "я"), ...characterRange("А", "Я")],
  MONGOLIAN: characterRange("ᠠ", "ᡯ"),
  HEBREW: characterRange("א", "ת"),
  HIRAGANA: characterRange("ぁ", "ゖ"),

  EGYPTIAN: characterRange("𓀀", "𓐮"),
  LINEARB: characterRange("𐂀", "𐃺"),

  ASTROLOGICAL: ["☉", "☽", ...characterRange("♁", "♇")],
  RUNIC: characterRange("ᚠ", "ᛪ"),
  CHESS: characterRange("♔", "♟"),
  ALCHEMY: characterRange("🜁", "🝳"),
  ARROWS: characterRange("←", "⇿"),
  DINGBAT: characterRange("✁", "➿"),
  MATH: characterRange("∀", "⋿"),
}

const EVAL_FUNCTIONS = {
  characterRange,
  chooseOne: (set) => set[Math.floor(Math.random() * set.length)],
  chooseMany: (set, count) => {
    let chars = []
    for (var i = 0; i < count; i++) {
      chars.push(set[Math.floor(Math.random() * set.length)])
    }
    return chars.join("")
  },
}

function onCircle(n) {
  let points = []
  for (let i = 0; i < n; i++) {
    let angle = (2.0 * Math.PI * i) / n + Math.PI / 2
    points.push([100 * Math.cos(angle), 100 * Math.sin(angle)])
  }
  return points
}

function onLine(n, min = 0, max = 1) {
  let points = []
  for (let i = 0; i < n; i++) {
    points.push([0, 100 * min + (100.0 * i * (max - min)) / (n - 1)])
  }
  return points
}

function round4(n) {
  return Math.round(n * 10000) / 10000
}

// https://stackoverflow.com/questions/5736398/how-to-calculate-the-svg-path-for-an-arc-of-a-circle
function calculateArc(min, max) {
  // Convert from 0-1 to radians
  // Rotate so 0 is the top
  min = min * 2 * Math.PI + Math.PI / 2
  max = max * 2 * Math.PI + Math.PI / 2

  return {
    startX: 100 * Math.cos(max),
    startY: 100 * Math.sin(max),
    endX: 100 * Math.cos(min),
    endY: 100 * Math.sin(min),
    largeArcFlag: max - min <= 180 ? 0 : 1,
  }
}

const GLOBALS = {
  // Terminals do not have any children, they just generate content
  terminal: {
    line: (min = 0, max = 1) => `<line x1="0" y1="${100.0 * min}" x2="0" y2="${100.0 * max}" />`,
    circle: () => '<circle cx="0" cy="0" r="100" />',
    polygon: (n = 5) =>
      `<polygon points="${onCircle(n)
        .map(([x, y]) => `${round4(x)},${round4(y)}`)
        .join(" ")}" />`,
    star: (n = 5, m = 2) => {
      let points = onCircle(n)
      let pointStrings = []
      for (let i = 0; i < n; i++) {
        let [x, y] = points[(i * m) % n]
        pointStrings.push(`${round4(x)},${round4(y)}`)
      }

      return `<polygon points="${pointStrings.join(" ")}" />`
    },
    textStar: (n = 5, m = 2, s = "", scale = 1) => {
      let points = onCircle(n)
      let path = []
      for (let i = 0; i < n; i++) {
        let [x, y] = points[(i * m) % n]
        path.push(`${i == 0 ? "M" : "L"} ${round4(x)} ${round4(y)}`)
      }
      path.push(`L 0 100`)
      return `<text font-size="${10.0 * scale}px"><textPath path="${path.join(" ")}">${s}</textPath></text>`
    },
    character: (c, scale = 1) => `<text font-size="${100.0 * scale}px" text-anchor="middle" dominant-baseline="central">${String.fromCodePoint(c)}</text>`,
    text: (s, scale = 1) => `<text font-size="${100.0 * scale}px" text-anchor="middle" dominant-baseline="central">${s}</text>`,
    textCircle: (s, scale = 1, outward = true) => {
      let path = `M 0 100 A 100 100 0 0 ${outward ? 1 : 0} 0 -100 A 100 100 0 0 ${outward ? 1 : 0} 0 100`
      return `<text font-size="${10.0 * scale}px"><textPath path="${path}">${s}</textPath></text>`
    },
    arc: (min = 0, max = 1) => {
      let { startX, startY, endX, endY, largeArcFlag } = calculateArc(min, max)
      return `<g fill="none"><path d="\
M ${startX} ${startY} \
A 100 100 0 ${largeArcFlag} 0 ${endX} ${endY} \
" /></g>`
    },
    moon: (phase) => {
      while (phase < 0) {
        phase += 1
      }
      phase = phase % 1

      if (phase < Number.EPSILON) {
        return '<circle cx="0" cy="0" r="100" />'
      }

      let { startX, startY, endX, endY, largeArcFlag } = calculateArc(-phase / 2, phase / 2)
      let flip = phase > 0.5 ? 1 : 0

      return `<g transform="rotate(-90)"><path d="\
M ${round4(startX)} ${round4(startY)} \
A 100 100 0 ${flip} ${1 - flip} ${round4(endX)} ${round4(endY)} \
A 100 100 0 ${1 - flip} ${flip} ${round4(startX)} ${round4(startY)} \
" /></g>`
    },
  },
  // Modifiers take a child and apply their changes to them
  modifier: {
    rune: () => (child) =>
      `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-120 -120 240 240">
    <style>* { vector-effect: non-scaling-stroke; stroke-linecap: square; }</style>
    <g transform="rotate(180)" stroke="black" fill="white" vector-effect="non-scaling-stroke">
      ${child.eval()}
    </g>
  </svg>
      `.trim(),
    group: () => (child) => child.eval(),
    scale: (x, y) => (child) => `<g data-source="scale(${y ? [x, y] : x})" transform="scale(${x}, ${y ? y : x})">${child.eval()}</g>`,
    fill: (color) => (child) => `<g data-source="fill(${color})" fill="${color}">${child.eval()}</g>`,
    stroke: (weight, color) => {
      let attrs = []
      if (weight !== undefined) attrs.push(`stroke-width="${weight}"`)
      if (color !== undefined) attrs.push(`stroke="${color}"`)

      return (child) => `<g ${attrs.join(" ")} data-source="stroke(${weight}, ${color})">${child.eval()}</g>`
    },
    invert: () => (child) => `<g data-source="invert" transform="rotate(180)">${child.eval()}</g>`,
    double:
      (scale = 1) =>
      (child) =>
        `${child.eval()}<g data-source="double(${scale})" transform="scale(${1 - scale})">${child.eval()}</g>`,
    translate:
      (x = 0, y = 0) =>
      (child) =>
        `<g transform="translate(${100.0 * x}, ${100.0 * y})">${child.eval()}</g>`,
    rotate: (angle) => (child) => `<g data-source="rotate(${angle})" transform="rotate(${360.0 * angle})">${child.eval()}</g>`,
    skew:
      (x = 0, y = 0) =>
      (child) =>
        `<g data-source="skew(${x}, ${y})" transform="skewX(${360.0 * x}) skewY(${360.0 * y})">${child.eval()}</g>`,
  },
  // Stackers apply to a list of children and organize them in various ways
  stacker: {
    stack: () => (children) => `<g data-source="stack()">${children.join(" ")}</g>`,
    radial:
      (scale = 1, offset = 1, rotate = false) =>
      (children) => {
        let points = onCircle(children.length)
        let nodes = []
        for (let i = 0; i < children.length; i++) {
          let [x, y] = points[i]
          x *= offset
          y *= offset

          let transforms = [`translate(${x}, ${y})`, `scale(${scale})`]
          if (rotate) {
            transforms.push(`rotate(${(360.0 * i) / children.length})`)
          }

          nodes.push(`<g data-source="radial(${scale}, ${offset}, ${rotate})" data-child="${i}" transform="${transforms.join(" ")}">${children[i]}</g>`)
        }
        return `<g data-source="radial(${scale}, ${offset}, ${rotate})">${nodes.join(" ")}</g>`
      },
    linear:
      (scale = 1, min = 0, max = 1) =>
      (children) => {
        let points = onLine(children.length, min, max)
        let nodes = []
        for (let i = 0; i < children.length; i++) {
          let [x, y] = points[i]
          nodes.push(`<g data-source="linear(${scale}, ${min}, ${max})" data-child="${i}" data-point="${x}, ${y}" transform="translate(${x}, ${y}) scale(${scale})">${children[i]}</g>`)
        }
        return `<g data-source="linear(${scale}, ${min}, ${max})">${nodes.join(" ")}</g>`
      },
  },
}

export { TOKEN_PATTERNS, EVAL_OPERATORS, EVAL_KEYWORDS, EVAL_FUNCTIONS, EVAL_CONSTANTS, GLOBALS }
