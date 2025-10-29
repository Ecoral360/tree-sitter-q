package tree_sitter_q_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_q "github.com/ecoral360/tree-sitter-q/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_q.Language())
	if language == nil {
		t.Errorf("Error loading Q grammar")
	}
}
