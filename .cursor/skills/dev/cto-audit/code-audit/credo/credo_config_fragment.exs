# Credo config fragment for CTO audit checks.
#
# Merge these entries into your project's .credo.exs.
# Replace __APP_MODULE__ with your actual app module name (e.g. MyApp)
# and __APP_NAME__ with the snake_case app name (e.g. my_app).
#
# 1. Add to the `requires` list:
#
#    requires: ["lib/__APP_NAME__/credo_checks/**/*.ex"]
#
# 2. Append to the `checks` list:
#
#    # CTO Audit — Elixir enforcement checks
#    {__APP_MODULE__.CredoChecks.SinglePipeChain, []},
#    {__APP_MODULE__.CredoChecks.LongWithChain, [max_clauses: 5]},
#    {__APP_MODULE__.CredoChecks.MaxFunctionLength, [max_length: 40]},
#    {__APP_MODULE__.CredoChecks.MaxFunctionArity, [max_arity: 4]},
#    {__APP_MODULE__.CredoChecks.SwallowedRescue, []},
#    {__APP_MODULE__.CredoChecks.MaxModulePublicFunctions, [max_count: 15]},
