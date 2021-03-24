require 'set'

SLOW_MODE = true

class LSystem
    def initialize(name, &block)
        @name = name
        @start = nil
        @alphabet = Set[]
        @terminals = Set[]
        @rules = {}
        @terminals = {}

        self.instance_eval(&block)
    end

    def start(key)
        @start = key
    end

    def rule(key, value)
        raise "duplicate key #{key}" if @rules.include? key

        @rules[key] = value
        @alphabet.add key
        value.chars.each { |k| @alphabet.add k }
    end

    def terminal(key, &block)
        raise "duplicate terminal #{key}" if @terminals.include? key
        
        @terminals[key] = block
    end

    def to_s
        return "LSystem
  Name: #{@name}
  Start: #{@start}
  Alphabet: #{@alphabet.to_a.join(" ") }
  Terminals: #{@terminals.keys.join(" ") }
  Rules:
#{@rules.map { |k, v| "    #{k} ➡ #{v}" }.join("\n")}
"
    end

    def forward(distance=1.0)
        emit "<!-- forward(#{distance}) -->" if @debug
        emit "<!-- x = #{@x}, y = #{@y}, r = #{@r} -->" if @debug

        # Intentionally reversed to rotate
        x1, y1 = @x, @y
        x2 = (x1 - 100.0 * distance * Math.sin(@r)).round(2)
        y2 = (y1 - 100.0 * distance * Math.cos(@r)).round(2)

        emit "<line x1=\"#{x1}\" y1=\"#{y1}\" x2=\"#{x2}\" y2=\"#{y2}\" />"

        @x, @y = x2, y2
        update_bounds
    end

    def push
        emit "<!-- push(#{[@x, @y, @r]}) on to #{@stack} -->" if @debug
        @stack.push([@x, @y, @r])
    end

    def pop
        emit "<!-- pop from #{@stack} -->" if @debug
        @x, @y, @r = @stack.pop
    end

    def rotate(angle, radians=false)
        emit "<!-- rotate(#{angle}, #{radians}) -->" if @debug

        angle = Math::PI * angle / 180.0 unless radians
        @r += angle
    end

    def to_svg(n, debug = false)
        @bounds = [0, 0, 0, 0]
        @x = 0
        @y = 0
        @r = 0
        @stack = []
        @output = []
        @debug = debug

        # Slow mode (calculate first)
        if SLOW_MODE
            # Expansion step
            state = @start
            n.times do
                state = state.chars.map { |c| @rules[c] or c }.join
            end

            # Evaluation step
            state.chars.each { |c| self.instance_eval(&@terminals[c]) if @terminals.include?(c) }

        # Fast mode (calculate as we go)
        else
            def recur(c, depth)
                if depth == 0
                    self.instance_eval(&@terminals[c]) if @terminals.include?(c)
                else
                    (@rules[c] or c).chars.each do
                        |c| recur(c, depth - 1)
                    end
                end
            end
            recur(@start, n)
        end


        viewport = "#{@bounds[0]} #{@bounds[1]} #{@bounds[2]-@bounds[0]} #{@bounds[3]-@bounds[1]}"
        return %{<?xml version="1.0" standalone="no"?>
<svg viewBox="#{viewport}" version="1.1" xmlns="http://www.w3.org/2000/svg">
\t<g stroke="black" fill="transparent" stroke-width="5">
\t\t#{@output.join("\n\t\t")}
\t</g>
</svg>
}
    end

private
    def emit(svg)
        @output.append svg
    end

    def update_bounds
        @bounds = [
            [@bounds[0], @x].min,
            [@bounds[1], @y].min,
            [@bounds[2], @x].max,
            [@bounds[3], @y].max,
        ]
    end
end
