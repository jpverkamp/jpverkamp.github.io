Node.class_eval do
    def triangle
        polygon 3
    end

    def polygon(points)
        star points, 1
    end

    def star(points, skip)
        pstring = points.times.map do |i|
            r = 100
            theta = Math::PI/2 + 2 * Math::PI / points * (i * skip % points)
            x = r * Math.cos(theta)
            y = r * Math.sin(theta)
            %(#{x},#{y})
        end

        @children.push(Node.new(:polygon, points: pstring.join(" ")))
        self
    end
end