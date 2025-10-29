/**
 * @file Q programming language
 * @author Mathis <ecomath360@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "q",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
