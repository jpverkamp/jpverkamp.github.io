Node.class_eval do
    def double(width, &block)
        run(&block)
        scale(1-width) { run(&block) }
        self
    end

    def invert(&block)
        rotate 180, &block
    end

    def transform(**kwargs, &block)
        ls = []
        ls.append("rotate(#{kwargs[:rotate].to_f})") if kwargs.include? :rotate
        ls.append("scale(#{kwargs[:scale].to_f})") if kwargs.include? :scale 
        ls.append("translate(#{100*(kwargs[:translateX] || 0).to_f},#{100*(kwargs[:translateY] || 0).to_f})") if kwargs.include?(:translateX) || kwargs.include?(:translateY)
        ls.append("skewX(#{kwargs[:skewX].to_f})") if kwargs.include? :skewX
        ls.append("skewY(#{kwargs[:skewY].to_f})") if kwargs.include? :skewY

        @children.push(Node.new(:g, transform: ls.join(" ")).run(&block))
        self
    end

    def rotate(degrees, &block)
        transform(rotate: degrees, &block)
    end

    def scale(scale, &block)
        transform(scale: scale, &block)
    end

    def translate(x: nil, y: nil, &block)
        transform(translateX: x, translateY: y, &block)
    end

    def skew(x: nil, y: nil, &block)
        transform(skewX: x, skewY: y, &block)
    end

    def style(width: nil, color: nil, fill: nil, &block)
        as = {}
        as[:"stroke-width"] = width if width
        as[:stroke] = color if color
        as[:fill] = fill if fill

        @children.push(Node.new(:g, **as).run(&block))
        self
    end
end