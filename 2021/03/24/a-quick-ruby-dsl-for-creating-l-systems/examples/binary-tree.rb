require './lsystem.rb'

ls = LSystem.new("Binary tree") do
    start "0"

    rule "1", "11"
    rule "0", "1[0]0"

    terminal "0" do forward end
    terminal "1" do forward end
    terminal "[" do
        push
        rotate -45, degrees = true
    end
    terminal "]" do
        pop
        rotate 45, degrees = true
    end
end

iterations = ARGV.length > 0 ? ARGV[0].to_i : 4
puts ls.to_svg(iterations)