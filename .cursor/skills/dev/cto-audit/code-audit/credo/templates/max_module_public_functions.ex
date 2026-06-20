defmodule __APP_MODULE__.CredoChecks.MaxModulePublicFunctions do
  use Credo.Check,
    base_priority: :normal,
    category: :design,
    param_defaults: [max_count: 15],
    explanations: [
      check: """
      Modules with too many public functions often lack a single clear
      responsibility ("god modules"). They become hard to understand, test,
      and safely modify.

      Consider splitting into focused modules with cohesive APIs.

      ## Configuration

          {#{inspect(__MODULE__)}, [max_count: 15]}
      """,
      params: [
        max_count: "Maximum number of public functions allowed in a single module."
      ]
    ]

  @impl true
  def run(%SourceFile{} = source_file, params \\ []) do
    max_count = Params.get(params, :max_count, __MODULE__)
    issue_meta = IssueMeta.for(source_file, params)

    source_file
    |> Credo.Code.prewalk(&collect_modules(&1, &2))
    |> Enum.reduce([], fn {module_name, line, public_count}, issues ->
      if public_count > max_count do
        issue =
          format_issue(issue_meta,
            message:
              "`#{module_name}` has #{public_count} public functions (max #{max_count}) — consider splitting responsibilities.",
            line_no: line
          )

        [issue | issues]
      else
        issues
      end
    end)
  end

  defp collect_modules({:defmodule, meta, [{:__aliases__, _, name_parts} | body]} = ast, acc) do
    module_name = Enum.join(name_parts, ".")
    public_count = count_public_functions(body)
    {ast, [{module_name, meta[:line], public_count} | acc]}
  end

  defp collect_modules(ast, acc), do: {ast, acc}

  defp count_public_functions(body) do
    {_, count} =
      Macro.prewalk(body, 0, fn
        {:def, _, [{name, _, _} | _]} = node, acc when is_atom(name) ->
          {node, acc + 1}

        # Don't count defmacro, defp, defmacrop, defdelegate, etc. as public
        # Actually defdelegate IS public — count it
        {:defdelegate, _, _} = node, acc ->
          {node, acc + 1}

        node, acc ->
          {node, acc}
      end)

    count
  end
end
