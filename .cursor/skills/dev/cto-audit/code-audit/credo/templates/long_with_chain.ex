defmodule __APP_MODULE__.CredoChecks.LongWithChain do
  use Credo.Check,
    base_priority: :high,
    category: :design,
    param_defaults: [max_clauses: 5],
    explanations: [
      check: """
      Long `with` chains become hard to debug and obscure error handling.

      When a `with` block has too many clauses, it typically means the function
      is doing too much. Extract groups of related clauses into named functions
      that return tagged tuples, then compose them.

      ## Configuration

          {#{inspect(__MODULE__)}, [max_clauses: 5]}
      """,
      params: [
        max_clauses: "Maximum number of `<-` clauses allowed in a single `with` block."
      ]
    ]

  @impl true
  def run(%SourceFile{} = source_file, params \\ []) do
    max_clauses = Params.get(params, :max_clauses, __MODULE__)
    issue_meta = IssueMeta.for(source_file, params)

    Credo.Code.prewalk(source_file, &traverse(&1, &2, issue_meta, max_clauses))
  end

  # Match `with` expressions and count their `<-` clauses
  defp traverse({:with, meta, args} = ast, issues, issue_meta, max_clauses)
       when is_list(args) do
    clause_count =
      args
      |> List.flatten()
      |> Enum.count(fn
        {:<-, _, _} -> true
        _ -> false
      end)

    if clause_count > max_clauses do
      issue =
        format_issue(issue_meta,
          message:
            "with block has #{clause_count} clauses (max #{max_clauses}) — consider extracting into named functions.",
          line_no: meta[:line]
        )

      {ast, [issue | issues]}
    else
      {ast, issues}
    end
  end

  defp traverse(ast, issues, _issue_meta, _max_clauses), do: {ast, issues}
end
