# People

Add person YAML files to this directory. One file per person. The filename
becomes the person ID (e.g. `x-y-x.yml` → id `x-y-x`).

## Example

```yaml
name: "X Y Z"
image: "https://github.com/x-y-x.png"
organization: "NukeHub"
role: "Research Engineer"
location: "Berlin, Germany"
email: "xyz@nukehub.org"
github: "x-y-x"
linkedin: "x-y-x"
category: "Core Contributors"
```

## Field reference

| Field | Required | Description |
|---|---|---|
| `name` | ✅ | Full name |
| `image` | ✅ | Profile photo URL |
| `email` | ✅ | Contact email |
| `category` | ✅ | Category title — must match a category in `src/content/peopleCategories/` |
| `organization` | | Affiliation |
| `role` | | Job title / role |
| `location` | | City, Country |
| `url` | | Personal website |
| `phone` | | Phone number |
| `github` | | GitHub username |
| `linkedin` | | LinkedIn username/slug |
| `x` | | X (Twitter) handle |
| `gitlab` | | GitLab username |
| `bitbucket` | | Bitbucket username |
| `stackoverflow` | | Stack Overflow user ID |
| `scholar` | | Google Scholar ID |
| `orcid` | | ORCID iD |
| `researchgate` | | ResearchGate profile name |
| `youtube` | | YouTube channel |
| `facebook` | | Facebook profile |
| `instagram` | | Instagram handle |
| `whatsapp` | | WhatsApp number |
| `signal` | | Signal username or phone number |
| `zotero` | | Zotero profile |
| `mastodon` | | Mastodon handle (e.g. `@user` or full URL) |
| `bluesky` | | Bluesky handle (e.g. `handle.bsky.social`) |
| `discord` | | Discord invite link or username |
| `telegram` | | Telegram username |
| `medium` | | Medium username or publication URL |
| `tiktok` | | TikTok username |
| `threads` | | Threads username |
| `x` | | X (Twitter) handle |
| `twitch` | | Twitch channel name |
| `reddit` | | Reddit username |
