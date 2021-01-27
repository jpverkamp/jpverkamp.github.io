$NON_SCALING_ELEMENTS = %w[circle path polygon line]

class String
    def squish
        gsub!(/\A[[:space:]]+/, '')
        gsub!(/[[:space:]]+\z/, '')
        gsub!(/[[:space:]]+/, ' ')
        self
    end
end

class Node
    def initialize(name, children=nil, **attributes)
        @name = name
        @attributes = attributes
        @children = children || []

        @attributes['vector-effect'] = 'non-scaling-stroke' if $NON_SCALING_ELEMENTS.include?(@name) or $NON_SCALING_ELEMENTS.include?(@name.to_s)
    end

    def run(*args, **kwargs, &block)
        self.instance_exec(*args, **kwargs, &block)
        self
    end

    def <<(child)
        @children.push(child)
        self
    end

    def to_s
        parts = []
        parts.append @name
        parts.append @attributes unless @attributes.empty?
        parts.append "[" + @children.map{ |n| n.to_s }.join(", ") + "]" unless @children.empty?
        return "Node<#{parts.join(" ")}>"
    end

    def to_xml(depth: 0)
        xml = %(#{'  ' * depth}<#{@name})
        xml += " " + @attributes.map { |k, v| "#{k}=\"#{v}\"" }.join(" ") unless @attributes.empty?
        if @children.empty?
            xml += " />\n"
        else
            xml += ">\n"
            @children.map do |child| 
                if child.is_a? Node
                    xml += child.to_xml(depth: depth + 1) 
                else
                    xml += "#{'  ' * (depth + 1)}#{child.to_s}\n"
                end
            end
            xml += "#{'  ' * depth}</#{@name}>\n"
        end
        return xml
    end
end

def rune(&block)
    Node.new(:svg, xmlns: "http://www.w3.org/2000/svg", viewBox: "-100 -100 200 200") <<
        Node.new(:g, transform: "rotate(180)", stroke: "black", fill: "white").run(&block)
end
