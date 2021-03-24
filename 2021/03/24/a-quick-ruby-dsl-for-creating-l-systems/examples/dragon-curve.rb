require './lsystem.rb'

ls = LSystem.new("Dragon Curve") do
    start "F"

    rule "F", "F+G"
    rule "G", "F-G"

    terminal "F" do forward end
    terminal "G" do forward end
    terminal "+" do rotate -90 end
    terminal "-" do rotate 90 end
end

iterations = ARGV.length > 0 ? ARGV[0].to_i : 4
puts ls.to_svg(iterations)