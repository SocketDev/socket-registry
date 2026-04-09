Run the `/updating-workflows` skill to execute the GitHub Actions SHA pin cascade.

Identifies which layer changed, creates PRs in dependency order (one per layer), waits for merges between layers, and propagates the final SHA to all consuming repos.
