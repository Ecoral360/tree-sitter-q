;; highlights.scm for Q language

;; --- Keywords ---
[
 "private"
 "public"
 "type"
 "extern"
 "var"
 "const"
 "special"
 "virtual"
 "def"
 "undef"
 "if"
 "then"
 "else"
 "where"
 "otherwise"
 "import"
 "include"
 "from"
 ] @keyword

;; --- Types ---
((type_identifier) @type)
; ((unqualified_identifier) @type)

;; --- Variables ---
((variable_identifier) @variable)

;; --- Functions ---
((function_identifier) @function)
((unqualified_opsym) @function)
((qualified_opsym) @function)

;; --- Modules ---
;((module_identifier) @namespace)
((qualified_identifier) @namespace)

;; --- Literals ---
((string) @string)
((unsigned_number) @number)

;; --- Operators ---
((unary_op) @operator)
((binary_op) @operator)
((opsym) @operator)

;; --- Punctuation ---
["(" ")" "{" "}" "[" "]" "," ";" ":"] @punctuation

;; --- Comments ---
((comment) @comment)
((shebang) @comment)

