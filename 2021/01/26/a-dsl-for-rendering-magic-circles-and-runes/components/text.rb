Node.class_eval do
    def text(text, scale: 1)
        @children.push(Node.new(
            :text,
            stroke: "none",
            fill: "black",
            "font-size": "#{100*scale.to_f}px",
            "text-anchor": "middle",
            "dominant-baseline": "central"
        ) << text)
        self
    end

    def circleText(text, scale: 1)
        @children.push(
            Node.new(:text,
                stroke: "none",
                fill: "black",
                "font-size": "#{10*scale.to_f}px"
            ) <<
            (Node.new(:textPath, "path": %(
                M -100, 0
                a 100,100 0 1,0 200,0
                a 100,100 0 1,0 -200,0                
            ).squish) << text)
        )
        self
    end

    def randomString(set, length)
        Array.new(length) { randomSymbol(set) }.join(" ")
    end

    def randomSymbol(set)
        {
            :greeklower => [*"α".."ω"],
            :greekupper => [*"Α".."Ω"],
            :greek => [*"α".."ω", *"Α".."Ω"],
            :cyrilliclower => [*"а".."я"],
            :cyrillicupper => [*"А".."Я"],
            :cyrillic => [*"а".."я", *"А".."Я"],
            :mongolian => [*"ᠠ".."ᡯ"],
            :hebrew => [*"א".."ת"],
            :hiragana => [*"ぁ".."ゖ"],
            
            :egyptian => [*"𓀀".."𓐮"],
            :linearb => [*"𐂀".."𐃺"],

            :astrological => ["☉", "☽", *"♁".."♇"],
            :runic => [*"ᚠ".."ᛪ"],
            :chess => [*"♔".."♟"],
            :alchemy => [*"🜁".."🝳"],
            :arrows => [*"←".."⇿"],
            :dingbat => [*"✁".."➿"],
            :math => [*"∀".."⋿"],


            #:zodiac => [*"♈︎".."♓︎"], # fix emoji issues
        }[set].sample
    end
end

