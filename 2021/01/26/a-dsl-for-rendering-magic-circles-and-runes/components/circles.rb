Node.class_eval do
    def circle
        @children.push(Node.new(:circle, cx: 0, cy: 0, r: 100))
        self
    end

    def dividedCircle(divisions, width: 1)
        circle
        style width: 1 do
            children divisions do line min: 1-width end 
        end
        scale 1-width do circle end
    end

    def arc(min: 0, max: 360, width: 0.1)
        x1, y1, x2, y2, flag = calculateArc(2 * Math::PI * min / 360, 2 * Math::PI * max / 360)
    
        @children.push(
            Node.new(:g, fill: "none") << 
            Node.new(:path, d: %(
                M #{x1} #{y1}
                A 100 100, 0, #{flag}, 0, #{x2} #{y2}
            ).squish)
        )

        self
    end
    
    def moon(phase)
        x1, y1, x2, y2, f1 = calculateArc(Math::PI * phase, -Math::PI * phase)
        flip = phase < 0.5 ? 1 : 0

        rotate 90 do 
            @children.push(
                Node.new(:path, d: %(
                    M #{x1} #{y1}
                    A 100 100, 0, #{flip}, #{1-flip}, #{x2} #{y2}
                    A 100 100, 0, #{1-flip}, #{flip}, #{x1} #{y1}
                ).squish)
            )
        end

        self
    end 

    private

    def calculateArc(min, max)
        # https://stackoverflow.com/questions/5736398/how-to-calculate-the-svg-path-for-an-arc-of-a-circle
    
        # Rotate so 0 is the top
        min += Math::PI / 2
        max += Math::PI / 2
    
        startX = (100 * Math.cos(max)).round(4)
        startY = (100 * Math.sin(max)).round(4)
        endX = (100 * Math.cos(min)).round(4)
        endY = (100 * Math.sin(min)).round(4)
        largeArcFlag = max - min <= 180 ? "0" : "1"
    
        return startX, startY, endX, endY, largeArcFlag
    end    
end



