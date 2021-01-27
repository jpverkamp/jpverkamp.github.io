Node.class_eval do
    def line(min: 0, max: 1)
        @children.push(Node.new(
            :line,
            x1: 0,
            y1: 100 * min.to_f,
            x2: 0,
            y2: 100 * max.to_f
        ))
        self
    end
end