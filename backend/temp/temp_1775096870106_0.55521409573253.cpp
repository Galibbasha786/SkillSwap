
#include <iostream>
#include <string>
#include <sstream>
#include <nlohmann/json.hpp>
using json = nlohmann::json;

#include<iostream>
using namespace std;

int solve(int n) {
    for(int i=1;i<=n;i++){
      cout << i;
      if(i<n) cout << " ";
    }
    return n;
}

int main() {
    std::string input;
    std::getline(std::cin, input);
    json inputJson = json::parse(input);
    json result = solve(inputJson);
    std::cout << result.dump() << std::endl;
    return 0;
}
  