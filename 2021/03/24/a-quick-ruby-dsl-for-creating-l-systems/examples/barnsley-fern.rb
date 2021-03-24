require './lsystem.rb'

ls = LSystem.new("Barnsley Fern") do
    start "+++X"

    rule "X", "F+[[X]-X]-F[-FX]+X" 
    rule "F", "FF"

    terminal "F" do forward end
    terminal "[" do push end
    terminal "]" do pop end
    terminal "-" do rotate -25 end
    terminal "+" do rotate +25 end
end

iterations = ARGV.length > 0 ? ARGV[0].to_i : 4
puts ls.to_svg(iterations)