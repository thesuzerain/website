---
layout: base
title: Blog posts
pagination:
  data: collections.blog
  size: 10
  alias: posts

---

## Paginated blog posts

{%- for post in posts %}
- [{{ post.data.title }}]({{ post.url }})
{%- endfor %}

