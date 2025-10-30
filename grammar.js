/**
 * @file Q programming language
 * @author Mathis <ecomath360@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
// grammar.js for Q Programming Language

// Tree-sitter grammar for Q programming language
// Pratt-friendly precedence mapping implemented via prec, prec.left, prec.right
module.exports = grammar({
  name: "q",

  extras: ($) => [/\s/, $.comment, $.shebang],

  externals: ($) => [],

  conflicts: ($) => [[$.unsigned_number], [$.expression_list]],

  precedences: ($) => [
    [
      "quotation", // highest
      "application",
      "composition",
      "exponent",
      "prefix",
      "multiplicative",
      "additive",
      "relational",
      "infix_application",
      "conditional",
      "sequence",
      "lambda", // lowest
    ],
  ],

  rules: {
    script: ($) => repeat(choice($.declaration, $.definition)),

    // --- Declarations and imports ---
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
      choice(
        seq("import", $.module_spec, repeat(seq(",", $.module_spec)), ";"),
        seq("include", $.module_spec, repeat(seq(",", $.module_spec)), ";"),
      ),

    qualified_import: ($) =>
      choice(
        seq("from", $.module_spec, "import", optional($.symbol_specs), ";"),
        seq("from", $.module_spec, "include", optional($.symbol_specs), ";"),
      ),

    module_spec: ($) =>
      seq($.module_name, optional(seq("as", $.unqualified_identifier))),
    module_name: ($) => choice($.unqualified_identifier, $.string),

    symbol_specs: ($) => seq($.symbol_spec, repeat(seq(",", $.symbol_spec))),
    symbol_spec: ($) =>
      seq(
        choice($.unqualified_identifier, $.unqualified_opsym),
        optional(
          seq("as", choice($.unqualified_identifier, $.unqualified_opsym)),
        ),
      ),

    prefix: ($) => choice($.scope, seq(optional($.scope), repeat1($.modifier))),
    scope: ($) => choice("private", "public"),
    modifier: ($) =>
      prec(10, choice("const", "special", "extern", "var", "virtual")),

    headers: ($) => seq($.header, repeat(seq(",", $.header))),

    header: ($) =>
      choice(
        seq($.unqualified_identifier, "=", $._expression),
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
      prec.left(
        choice(
          seq(
            $._expression,
            optional($.lqualifiers),
            "=",
            $._expression,
            optional($.qualifiers),
            ";",
            repeat(
              seq(
                optional($.lqualifiers),
                "=",
                $._expression,
                optional($.qualifiers),
                ";",
              ),
            ),
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
      ),

    lqualifiers: ($) => seq(repeat($.qualifier), ":"),
    qualifiers: ($) => repeat1($.qualifier),
    qualifier: ($) => choice($.condition, $.where_clause),

    condition: ($) => choice(seq("if", $._expression), "otherwise"),
    where_clause: ($) =>
      seq(
        "where",
        $._expression,
        "=",
        $._expression,
        repeat(seq(",", $._expression, "=", $._expression)),
      ),

    // --- Expressions (Pratt-like via precedence helpers) ---
    _expression: ($) =>
      prec(
        1,
        choice(
          $.identifier,
          $.var_decl,
          $.typed_var,
          $.unsigned_number,
          $.string,
          $.lambda,
          $.conditional,
          $.parenthesized,
          $.bracketed,
          $.brace_enclosed,
          $.operator_literal,
          $.binary_section,
        ),
      ),

    identifier: ($) => choice($.unqualified_identifier, $.qualified_identifier),

    // identifiers
    qualified_identifier: ($) =>
      seq($.module_identifier, "::", $.unqualified_identifier),
    unqualified_identifier: ($) =>
      prec(
        4,
        choice($.variable_identifier, $.function_identifier, $.type_identifier),
      ),

    module_identifier: ($) => /[A-Z][A-Za-z0-9_]*/,
    type_identifier: ($) => /[A-Z][A-Za-z0-9_]*/,
    variable_identifier: ($) => prec(5, choice("_", /[A-Z][A-Za-z0-9_]*/)),
    function_identifier: ($) => /[a-z_][A-Za-z0-9_]*/,

    // var declaration: 'var' unqualified-identifier
    var_decl: ($) => seq("var", $.unqualified_identifier),
    typed_var: ($) => seq($.variable_identifier, ":", $.identifier),

    // literals
    // number: ($) => seq(optional("-"), $.unsigned_number),
    unsigned_number: ($) =>
      choice(
        /0[0-7]+/,
        /0[xX][0-9a-fA-F]+/,
        seq(/\d+/, optional(seq(".", optional(/\d+/))), optional($.scalefact)),
        seq(".", /\d+/, optional($.scalefact)),
      ),
    scalefact: ($) => seq(choice("E", "e"), optional("-"), /\d+/),

    string: ($) => /"([^"\\\n]|\\.)*"/,

    // parenthesized forms, sections, operator literal
    parenthesized: ($) =>
      seq(
        "(",
        optional(choice($.element_list, $.enumeration, $.comprehension)),
        ")",
      ),
    bracketed: ($) =>
      seq(
        "[",
        optional(choice($.element_list, $.enumeration, $.comprehension)),
        "]",
      ),
    brace_enclosed: ($) =>
      seq(
        "{",
        optional(choice($.element_list, $.enumeration, $.comprehension)),
        "}",
      ),

    element_list: ($) =>
      choice(
        seq(
          $.expression_list,
          optional(choice(",", ";", seq("|", $.expression))),
        ),
      ),

    enumeration: ($) => seq($.expression_list, "..", optional($._expression)),
    comprehension: ($) => seq($._expression, ":", $.expression_list),

    expression_list: ($) =>
      seq(
        $._expression,
        choice(
          repeat(seq(",", $._expression)),
          repeat(seq(";", $._expression)),
        ),
      ),

    // operator literal and sections: (op), (expr op), (op expr)
    operator_literal: ($) => seq("(", $.op, ")"),
    binary_section: ($) =>
      choice(
        seq("(", $._expression, $.binary_op, ")"),
        seq("(", $.binary_op, $._expression, ")"),
      ),

    op: ($) => choice($.unary_op, $.binary_op),

    unary_op: ($) => prec(2, $.opsym),
    binary_op: ($) =>
      prec(1, choice($.opsym, seq("and", "then"), seq("or", "else"))),

    opsym: ($) => choice($.qualified_opsym, $.unqualified_opsym),
    qualified_opsym: ($) => seq($.module_identifier, "::", $.unqualified_opsym),
    unqualified_opsym: ($) =>
      choice($.function_identifier, /[\p{Punctuation}]+/u),

    // explicit operator tokens for common symbols (optional helpers)
    // we also make sure relational tokens are separate

    // --- Expression constructs with precedence ---
    // Quotation operators (highest, prefix)
    quotation: ($) =>
      prec.left(10, seq(choice("`", "'", "~", "&"), $._expression)),

    // Application (juxtaposition) - implemented as left-assoc with high precedence
    application: ($) => prec.left(9, seq($._expression, $._expression)),

    // Composition
    composition: ($) => prec.left(8, seq($._expression, ".", $._expression)),

    // Exponentiation and subscript (right-assoc)
    exponent: ($) =>
      prec.right(7, seq($._expression, choice("^", "!"), $._expression)),

    // Prefix ops
    prefix_op: ($) =>
      prec.right(6, seq(choice("-", "#", "not"), $._expression)),

    // Multiplicative
    multiplicative: ($) =>
      prec.left(
        5,
        seq(
          $._expression,
          choice("*", "/", "div", "mod", "and", "and-then"),
          $._expression,
        ),
      ),

    // Additive
    additive: ($) =>
      prec.left(
        4,
        seq(
          $._expression,
          choice("++", "+", "-", "or", "or-else"),
          $._expression,
        ),
      ),

    // Relational (non-assoc) -> use a separate rule and guard later
    relational: ($) =>
      prec.left(
        3,
        seq(
          $._expression,
          choice("<", ">", "=", "<=", ">=", "<>", "=="),
          $._expression,
        ),
      ),

    // Infix application '$' (right assoc)
    infix_application: ($) =>
      prec.right(2, seq($._expression, "$", $._expression)),

    // Conditional/if-then-else
    conditional: ($) =>
      prec.left(
        1,
        seq(
          "if",
          $._expression,
          "then",
          $._expression,
          optional(seq("else", $._expression)),
        ),
      ),

    // Sequence operator '||'
    sequence: ($) => prec.left(0, seq($._expression, "||", $._expression)),

    // Lambda (lowest)
    lambda: ($) =>
      seq(
        "\\",
        repeat1(field("param", choice($.identifier, $._expression))),
        ".",
        field("body", $._expression),
      ),

    // helper for expression rule (preferred entry point using precedence order)
    expression: ($) =>
      prec(
        2,
        choice(
          $.quotation,
          $.application,
          $.composition,
          $.exponent,
          $.prefix_op,
          $.multiplicative,
          $.additive,
          $.relational,
          $.infix_application,
          $.conditional,
          $.sequence,
          $.lambda,
          $._expression,
        ),
      ),

    // var/typed etc are part of _expression earlier

    // tokens
    comment: ($) =>
      token(choice(seq("//", /.*/), seq("/*", /([^*]|\*[^\/])*/, "*/"))),

    shebang: ($) => token(seq("#!", /.*/)),

    // raw tokens for identifiers and numbers used above
    // Note: Tree-sitter automatically orders tokens; we tune by regexes
  },
});
