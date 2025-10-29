/**
 * @file Q programming language
 * @author Mathis <ecomath360@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
// grammar.js for Q Programming Language
module.exports = grammar({
  name: "q",

  extras: ($) => [
    /\s/, // whitespace
    $.comment,
    $.shebang,
  ],

  conflicts: ($) => [
    [$.modifier, $.expression],
    [$.unqualified_identifier, $.unqualified_opsym],
    [$.unqualified_identifier, $.expression],
    [$.unary_op, $.binary_op],
    [$.expression],
    [$.definition, $.expression],
  ],

  rules: {
    script: ($) => seq(repeat1(choice($.declaration, $.definition))),

    shebang: ($) => token(seq("#!", /.*/)),

    comment: ($) =>
      token(choice(seq("//", /.*/), seq("/*", /([^*]|\*[^\/])*/, "*/"))),

    // --- Declarations ---
    declaration: ($) =>
      choice(
        $.unqualified_import,
        $.qualified_import,
        seq($.prefix, $.headers, ";"),
        seq(
          optional($.scope),
          "type",
          $.unqualified_identifier,
          optional(seq(":", $.identifier)),
          optional(seq("=", $.sections)),
          ";",
        ),
        seq(
          optional($.scope),
          "extern",
          "type",
          $.unqualified_identifier,
          optional(seq(":", $.identifier)),
          optional(seq("=", $.sections)),
          ";",
        ),
        seq(
          optional($.scope),
          "type",
          $.qualified_identifier,
          optional(seq("as", $.unqualified_identifier)),
          ";",
        ),
        seq(
          optional($.scope),
          "type",
          $.unqualified_identifier,
          "==",
          $.identifier,
          ";",
        ),
        seq("@", optional(choice("+", "-")), $.unsigned_number),
      ),

    unqualified_import: ($) =>
      seq(
        choice("import", "include"),
        $.module_spec,
        repeat(seq(",", $.module_spec)),
        ";",
      ),

    qualified_import: ($) =>
      seq(
        "from",
        $.module_spec,
        choice(
          seq("import", optional($.symbol_specs)),
          seq("include", optional($.symbol_specs)),
        ),
        ";",
      ),

    module_spec: ($) =>
      seq($.module_name, optional(seq("as", $.unqualified_identifier))),
    module_name: ($) => choice($.unqualified_identifier, $.string),
    symbol_specs: ($) => seq($.symbol_spec, repeat(seq(",", $.symbol_spec))),
    symbol_spec: ($) => seq($.identifier, optional(seq("as", $.identifier))),

    prefix: ($) => choice($.scope, seq(optional($.scope), repeat1($.modifier))),
    scope: ($) => choice("private", "public"),
    modifier: ($) => choice("const", "special", "extern", "var", "virtual"),

    headers: ($) => seq($.header, repeat(seq(",", $.header))),
    header: ($) =>
      choice(
        seq($.unqualified_identifier, "=", $.expression),
        seq(
          $.unqualified_identifier,
          repeat(seq(optional("~"), $.variable_identifier)),
        ),
        seq(
          $.qualified_identifier,
          repeat(seq(optional("~"), $.variable_identifier)),
          optional(seq("as", $.unqualified_identifier)),
        ),
        seq(
          "(",
          $.unqualified_opsym,
          ")",
          repeat(seq(optional("~"), $.variable_identifier)),
          optional(seq("@", $.precedence)),
        ),
        seq(
          "(",
          $.qualified_opsym,
          ")",
          repeat(seq(optional("~"), $.variable_identifier)),
          optional(seq("@", $.precedence)),
          optional(seq("as", $.unqualified_opsym)),
        ),
      ),

    precedence: ($) => choice($.unsigned_number, seq("(", $.op, ")")),
    sections: ($) => seq($.section, repeat(seq("|", $.section))),
    section: ($) => seq(optional($.prefix), $.headers),

    // --- Definitions ---
    definition: ($) =>
      choice(
        seq(
          $.expression,
          optional($.lqualifiers),
          "=",
          $.expression,
          optional($.qualifiers),
          ";",
        ),
        seq(
          "def",
          $.expression,
          "=",
          $.expression,
          repeat(seq(",", $.expression, "=", $.expression)),
          ";",
        ),
        seq("undef", $.identifier, repeat(seq(",", $.identifier)), ";"),
      ),

    lqualifiers: ($) => seq($.qualifier, repeat($.qualifier), ":"),
    qualifiers: ($) => repeat1($.qualifier),
    qualifier: ($) => choice($.condition, $.where_clause),
    condition: ($) => choice(seq("if", $.expression), "otherwise"),
    where_clause: ($) =>
      seq(
        "where",
        $.expression,
        "=",
        $.expression,
        repeat(seq(",", $.expression, "=", $.expression)),
      ),

    // --- Expressions ---
    expression: ($) =>
      choice(
        $.identifier,
        seq("var", $.unqualified_identifier),
        seq($.variable_identifier, ":", $.identifier),
        $.number,
        $.string,
        // --- Quotation operators ---
        prec(13, seq(choice("'", "`", "~", "&"), $.expression)), // highest precedence unary ` ' ~ & `
        prec(0, seq($.unary_op, $.expression)), // highest precedence unary ` ' ~ & `
        // --- Function composition ---
        prec.left(10, seq($.expression, ".", $.expression)),
        // --- Exponent/subscript ---
        prec.right(9, seq($.expression, choice("^", "!"), $.expression)),
        // --- Unary prefix -, #, not ---
        prec.right(8, seq(choice("-", "#", "not"), $.expression)),
        // --- Multiplication / and / div / mod ---
        prec.left(
          7,
          seq(
            $.expression,
            choice("*", "/", "div", "mod", "and", "and-then"),
            $.expression,
          ),
        ),
        // --- Addition / or ---
        prec.left(
          6,
          seq(
            $.expression,
            choice("++", "+", "-", "or", "or-else"),
            $.expression,
          ),
        ),
        // --- Relational (nonassociative) ---
        prec(
          5,
          seq(
            $.expression,
            choice("<", ">", "=", "<=", ">=", "<>", "=="),
            $.expression,
          ),
        ),
        // --- Infix application operator ---
        prec.right(4, seq($.expression, "$", $.expression)),
        // --- Conditional ---
        prec.right(
          3,
          seq(
            "if",
            $.expression,
            "then",
            $.expression,
            optional(seq("else", $.expression)),
          ),
        ),
        // --- Sequence operator ---
        prec.left(2, seq($.expression, "||", $.expression)),
        // --- Lambda abstractions ---
        seq("\\", prec.right(1, seq(repeat1($.expression), ".", $.expression))),
        // --- Application: expression expression ---
        prec.left(11, seq($.expression, $.expression)),
        // --- Parentheses for grouping ---
        seq(
          "(",
          optional(choice($.element_list, $.enumeration, $.comprehension)),
          ")",
        ),
        seq(
          "[",
          optional(choice($.element_list, $.enumeration, $.comprehension)),
          "]",
        ),
        seq(
          "{",
          optional(choice($.element_list, $.enumeration, $.comprehension)),
          "}",
        ),
        seq("(", $.op, ")"),
        seq("(", $.expression, $.binary_op, ")"),
        seq("(", $.binary_op, $.expression, ")"),
      ),

    element_list: ($) =>
      seq(
        $.expression_list,
        optional(seq(choice(",", ";", "|"), $.expression)),
      ),
    enumeration: ($) => seq($.expression_list, "..", optional($.expression)),
    comprehension: ($) => seq($.expression, ":", $.expression_list),
    expression_list: ($) =>
      prec.left(
        seq(
          $.expression,
          repeat(seq(",", $.expression)),
          optional(repeat(seq(";", $.expression))),
        ),
      ),

    // --- Identifiers ---
    identifier: ($) => choice($.unqualified_identifier, $.qualified_identifier),
    qualified_identifier: ($) =>
      seq($.module_identifier, "::", $.unqualified_identifier),
    unqualified_identifier: ($) =>
      choice($.variable_identifier, $.function_identifier), //, $.type_identifier),
    module_identifier: ($) => /([a-zA-Z_]|\p{Letter})(\p{Letter}|[a-zA-Z0-9_])*/u,
    type_identifier: ($) => /([a-zA-Z_]|\p{Letter})(\p{Letter}|[a-zA-Z0-9_])*/u,
    variable_identifier: ($) =>
      choice(/([A-Z]|\p{Uppercase_Letter})(\p{Letter}|[a-zA-Z0-9_])*/u, "_"),
    function_identifier: ($) => /([a-z_]|\p{Lowercase_Letter})(\p{Letter}|[a-zA-Z0-9_])*/u,

    // --- Operators ---
    op: ($) => choice($.unary_op, $.binary_op),
    unary_op: ($) => $.opsym,
    binary_op: ($) => choice($.opsym, seq("and", "then"), seq("or", "else")),

    opsym: ($) => choice($.unqualified_opsym, $.qualified_opsym),
    qualified_opsym: ($) => seq($.module_identifier, "::", $.unqualified_opsym),
    unqualified_opsym: ($) => choice($.function_identifier, /\p{P}+/u),

    // --- Literals ---
    number: ($) => $.unsigned_number,
    unsigned_number: ($) =>
      token(
        choice(
          seq(/0x/i, /[0-9a-fA-F]+/),
          seq("0", /[0-7]*/),
          seq(
            /[0-9]+/,
            optional(seq(".", optional(/[0-9]*/))),
            optional(seq(/e/i, optional("-"), /[0-9]+/)),
          ),
          seq(".", /[0-9]+/, optional(seq(/e/i, optional("-"), /[0-9]+/))),
        ),
      ),
    scalefact: ($) => seq(/e/i, optional("-"), /[0-9]+/),
    string: ($) => /"[^"\n]*"/,
  },
});
