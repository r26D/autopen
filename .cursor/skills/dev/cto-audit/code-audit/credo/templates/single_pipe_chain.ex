defmodule __APP_MODULE__.CredoChecks.SinglePipeChain do
  use Credo.Check,
    base_priority: :normal,
    category: :readability,
    param_defaults: [],
    explanations: [
      check: """
      Single-step pipe chains like `x |> f()` should be written as `f(x)`.

      Pipes are valuable when chaining multiple transformations, but a single
      pipe adds visual noise without improving clarity.

      Multi-step pipes like `x |> f() |> g()` are fine and will not be flagged.

      ## Example

          # Preferred
          String.trim(input)

          # Avoid
          input |> String.trim()
      """
    ]

  @impl true
  def run(%SourceFile{} = source_file, params \\ []) do
    issue_meta = IssueMeta.for(source_file, params)

    {_ast, {issues, _inside_pipe}} =
      source_file
      |> Credo.Code.ast()
      |> walk(issue_meta)

    issues
  end

  # Custom walker that tracks whether we're inside a pipe chain.
  # When we enter a |> node, we check depth. If depth == 1 (single pipe),
  # flag it. Then walk children with inside_pipe=true so inner |> nodes
  # of multi-step chains don't get re-flagged.
  defp walk(ast, issue_meta) do
    do_walk(ast, {[], false}, issue_meta)
  end

  defp do_walk({:|>, meta, [left, right]} = ast, {issues, inside_pipe}, issue_meta) do
    if inside_pipe do
      # We're inside a multi-step chain — don't flag, just walk children
      {_, {issues, _}} = do_walk(left, {issues, true}, issue_meta)
      {_, {issues, _}} = do_walk(right, {issues, false}, issue_meta)
      {ast, {issues, true}}
    else
      depth = pipe_depth(ast)

      issues =
        if depth == 1 do
          issue =
            format_issue(issue_meta,
              message: "Single-step pipe chain — use a direct function call instead.",
              line_no: meta[:line]
            )

          [issue | issues]
        else
          issues
        end

      # Walk children — left side is inside a pipe chain, right is not
      {_, {issues, _}} = do_walk(left, {issues, depth > 1}, issue_meta)
      {_, {issues, _}} = do_walk(right, {issues, false}, issue_meta)
      {ast, {issues, false}}
    end
  end

  defp do_walk({_form, _meta, args} = ast, acc, issue_meta) when is_list(args) do
    acc = Enum.reduce(args, acc, fn child, acc -> elem(do_walk(child, acc, issue_meta), 1) end)
    {ast, acc}
  end

  defp do_walk([_ | _] = list, acc, issue_meta) do
    acc = Enum.reduce(list, acc, fn child, acc -> elem(do_walk(child, acc, issue_meta), 1) end)
    {list, acc}
  end

  defp do_walk({left, right}, acc, issue_meta) do
    {_, acc} = do_walk(left, acc, issue_meta)
    {_, acc} = do_walk(right, acc, issue_meta)
    {{left, right}, acc}
  end

  defp do_walk(ast, acc, _issue_meta), do: {ast, acc}

  defp pipe_depth({:|>, _meta, [left, _right]}), do: 1 + pipe_depth(left)
  defp pipe_depth(_), do: 0
end
