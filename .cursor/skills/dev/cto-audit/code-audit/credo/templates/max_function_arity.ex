defmodule __APP_MODULE__.CredoChecks.MaxFunctionArity do
  use Credo.Check,
    base_priority: :normal,
    category: :design,
    param_defaults: [max_arity: 4],
    explanations: [
      check: """
      Functions with too many parameters are hard to call correctly and often
      indicate that related arguments should be grouped into a struct or options
      keyword list.

      ## Configuration

          {#{inspect(__MODULE__)}, [max_arity: 4]}
      """,
      params: [
        max_arity: "Maximum number of parameters allowed in a function definition."
      ]
    ]

  @impl true
  def run(%SourceFile{} = source_file, params \\ []) do
    max_arity = Params.get(params, :max_arity, __MODULE__)
    issue_meta = IssueMeta.for(source_file, params)

    Credo.Code.prewalk(source_file, &traverse(&1, &2, issue_meta, max_arity))
  end

  defp traverse({kind, meta, [{name, _, args} | _]} = ast, issues, issue_meta, max_arity)
       when kind in [:def, :defp] and is_atom(name) and is_list(args) do
    arity = length(args)

    if arity > max_arity do
      issue =
        format_issue(issue_meta,
          message:
            "`#{name}/#{arity}` has #{arity} parameters (max #{max_arity}) — consider a struct or keyword options.",
          line_no: meta[:line]
        )

      {ast, [issue | issues]}
    else
      {ast, issues}
    end
  end

  defp traverse(ast, issues, _issue_meta, _max_arity), do: {ast, issues}
end
