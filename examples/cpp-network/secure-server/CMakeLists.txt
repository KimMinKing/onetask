cmake_minimum_required(VERSION 3.20)
project(onetask_secure_server LANGUAGES CXX)

if(WIN32)
  message(FATAL_ERROR "This first secure-server implementation targets POSIX/Linux only")
endif()

find_package(OpenSSL 3 REQUIRED COMPONENTS SSL Crypto)
find_package(Threads REQUIRED)
find_package(Python3 COMPONENTS Interpreter REQUIRED)
find_program(OPENSSL_TOOL openssl REQUIRED)

add_executable(secure_server secure_server.cpp)
target_compile_features(secure_server PRIVATE cxx_std_20)
target_compile_options(secure_server PRIVATE -Wall -Wextra -Wpedantic -Werror)
target_link_libraries(secure_server PRIVATE OpenSSL::SSL OpenSSL::Crypto Threads::Threads)

enable_testing()
add_test(NAME secure_server_integration
  COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/test_secure_server.py" -v)
set_tests_properties(secure_server_integration PROPERTIES
  ENVIRONMENT "SECURE_SERVER_BINARY=$<TARGET_FILE:secure_server>;OPENSSL_TOOL=${OPENSSL_TOOL}")
