require './lsystem.rb'

ls = LSystem.new("Sierpinski arrowhead curve") do
    start "A"

    rule "A", "B-A-B"
    rule "B", "A+B+A"

    terminal "A" do forward end
    terminal "B" do forward end
    terminal "+" do rotate -60 end
    terminal "-" do rotate 60 end
end

iterations = ARGV.length > 0 ? ARGV[0].to_i : 4
puts ls.to_svg(iterations)