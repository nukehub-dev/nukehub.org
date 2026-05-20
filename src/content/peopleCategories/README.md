# People Categories

Add category YAML files to this directory. Each file defines a group that
people can belong to. The `title` field must match the `category` field used
in person files under `src/content/people/`.

## Example

```yaml
title: "Core Contributors"
description: "Active contributors who have made significant code, documentation, or community contributions to NukeHub projects."
order: 2
```

## Field reference

| Field | Required | Description |
|---|---|---|
| `title` | ✅ | Category name — must match `category` in person files |
| `description` | ✅ | Shown as explanatory text under the category heading |
