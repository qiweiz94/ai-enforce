package ai_enforce_policy

# Default: allow all actions
default allow := true
default deny := false
default block := false

# Block destructive commands
deny if {
    cmd := input.command
    startswith(cmd, "rm -rf /")
}
block if {
    cmd := input.command
    startswith(cmd, "rm -rf /")
}

# Block git hook bypass
deny if {
    cmd := input.command
    contains(cmd, "--no-verify")
}

# Warn on sudo usage
warn if {
    cmd := input.command
    contains(cmd, "sudo ")
}
