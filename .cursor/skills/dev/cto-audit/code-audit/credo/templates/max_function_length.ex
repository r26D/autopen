defmodule __APP_MODULE__.CredoChecks.MaxFunctionLength do
  use Credo.Check,
    base_priority: :high,
    category: :design,
    param_defaults: [max_length: 40],
    explanations: [
      check: """
      Functions that exceed a maximum line count likely have multiple
      responsibilities and should be decomposed.

      This complements Credo's built-in complexity checks (CyclomaticComplexity,
      ABCSize) by catching long-but-simple functions that do too much sequentially.

      ## Configuration

          {#{inspect(__MODULE__)}, [max_length: 40]}
      """,
      params: [
        max_length: "Maximum number of lines allowed in a single function body."
      ]
    ]

  @impl true
  def run(%SourceFile{} = source_file, params \\ []) do
    max_length = Params.get(params, :max_length, __MODULE__)
    issue_meta = IssueMeta.for(source_file, params)

    source_file
    |> Credo.Code.prewalk(&collect_functions(&1, &2))
    |> Enum.reduce([], fn {name, start_line, end_line}, issues ->
      length = end_line - start_line + 1

      if length > max_length do
        issue =
          format_issue(issue_meta,
            message:
              "Function `#{name}` is #{length} lines long (max #{max_length}) — consider decomposing.",
            line_no: start_line
          )

        [issue | issues]
      else
        issues
      end
    end)
  end

  defp collect_functions({kind, meta, [{name, _, _args} | _]} = ast, acc)
       when kind in [:def, :defp] and is_atom(name) do
    start_line = meta[:line]
    end_line = find_end_line(ast, start_line)
    {ast, [{name, start_line, end_line} | acc]}
  end

  defp collect_functions(ast, acc), do: {ast, acc}

  defp find_end_line(ast, default) do
    {_, max_line} =
      Macro.prewalk(ast, default, fn
        {_, meta, _} = node, acc when is_list(meta) ->
          line = Keyword.get(meta, :line, acc)
          {node, max(acc, line)}

        node, acc ->
          {node, acc}
      end)

    max_line
  end
end
