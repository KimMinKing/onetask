cmake_minimum_required(VERSION 3.20)
project(onetask_socket_lab LANGUAGES CXX)

if(WIN32)
  add_executable(socket_lab socket_lab_windows.cpp)
  target_link_libraries(socket_lab PRIVATE ws2_32)
else()
  add_executable(socket_lab socket_lab.cpp)
endif()

target_compile_features(socket_lab PRIVATE cxx_std_20)
add_executable(address_lookup address_lookup.cpp)
target_compile_features(address_lookup PRIVATE cxx_std_20)
if(WIN32)
  target_link_libraries(address_lookup PRIVATE ws2_32)
endif()
if(MSVC)
  target_compile_options(socket_lab PRIVATE /W4 /WX)
  target_compile_options(address_lookup PRIVATE /W4 /WX)
else()
  target_compile_options(socket_lab PRIVATE -Wall -Wextra -Wpedantic -Werror)
  target_compile_options(address_lookup PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()

find_package(Python3 COMPONENTS Interpreter REQUIRED)
enable_testing()
add_test(NAME socket_lab_integration
  COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/test_socket_lab.py" -v)
set_tests_properties(socket_lab_integration PROPERTIES
  ENVIRONMENT "SOCKET_LAB_BINARY=$<TARGET_FILE:socket_lab>")
add_test(NAME address_lookup_integration
  COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/test_address_lookup.py" -v)
set_tests_properties(address_lookup_integration PROPERTIES
  ENVIRONMENT "ADDRESS_LOOKUP_BINARY=$<TARGET_FILE:address_lookup>")
