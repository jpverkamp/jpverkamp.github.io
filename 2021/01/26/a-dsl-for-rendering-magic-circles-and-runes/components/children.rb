Node.class_eval do
    def children(ls, scale: 1, offset: 0, &block)
        ls = *(0..ls-1) if ls.is_a? Integer

        group = Node.new(:g)
        
        ls.each_with_index do |el, i|
            group << Node.new(:g, transform: %(
                rotate(#{i*360.0/ls.length})
                translate(0 #{100*offset.to_f})
                scale(#{scale.to_f})
            ).squish).run(el, &block)
        end

        @children.push(group)
        self
    end
end
