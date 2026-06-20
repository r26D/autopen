defmodule __APP_MODULE__.CredoChecks.SwallowedRescue do
  use Credo.Check,
    base_priority: :high,
    category: :design,
    param_defaults: [],
    explanations: [
      check: """
      Rescue clauses that silently discard exceptions hide bugs and make
      debugging nearly impossible.

      A rescue clause should do at least one of:
      - Log the error (via Logger)
      - Re-raise the exception (reraise/raise)
      - Return a tagged error tuple ({:error, reason})

      Catching an exception and returning a bare `:ok`, `:error`, or `nil`
      without logging is almost always a mistake.

      ## Example

          # Bad — swallowed
          try do
            dangerous()
          rescue
            _ -> :error
          end

          # Good — logged and tagged
          try do
            dangerous()
          rescue
            e ->
              Logger.error("Failed: \#{inspect(e)}")
              {:error, e}
          end
      """
    ]

  @impl true
  def run(%SourceFile{} = source_file, params \\ []) do
    issue_meta = IssueMeta.for(source_file, params)

    Credo.Code.prewalk(source_file, &traverse(&1, &2, issue_meta))
  end

  # Match `rescue` clauses inside `try` blocks
  defp traverse({:try, _meta, [blocks]} = ast, issues, issue_meta) when is_list(blocks) do
    rescue_clauses = Keyword.get(blocks, :rescue, [])

    new_issues =
      rescue_clauses
      |> Enum.filter(&swallowed_clause?/1)
      |> Enum.map(fn {:->, meta, _} ->
        format_issue(issue_meta,
          message: "Rescue clause swallows the exception — add logging, re-raise, or return {:error, reason}.",
          line_no: meta[:line]
        )
      end)

    {ast, new_issues ++ issues}
  end

  defp traverse(ast, issues, _issue_meta), do: {ast, issues}

  # A clause is "swallowed" if its body doesn't contain Logger, reraise, raise, or {:error, _}
  defp swallowed_clause?({:->, _meta, [_pattern, body]}) do
    not body_handles_error?(body)
  end

  defp swallowed_clause?(_), do: false

  defp body_handles_error?(body) do
    {_, found?} =
      Macro.prewalk(body, false, fn
        # Logger.anything(...)
        {{:., _, [{:__aliases__, _, [:Logger]}, _]}, _, _} = node, _acc ->
          {node, true}

        # require Logger; Logger.error(...)
        {:Logger, _, _} = node, _acc ->
          {node, true}

        # reraise
        {:reraise, _, _} = node, _acc ->
          {node, true}

        # raise (re-raising)
        {:raise, _, _} = node, _acc ->
          {node, true}

        # {:error, reason} tuple
        {:{}, _, [:error | _]} = node, _acc ->
          {node, true}

        {:error, _} = node, _acc ->
          {node, true}

        node, acc ->
          {node, acc}
      end)

    found?
  end
end
