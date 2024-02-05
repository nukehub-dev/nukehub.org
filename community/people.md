---
layout: page
id: people
title: People
permalink: /people
---
{% for obj in site.data.people %}
# {{ obj.title }}
<div class="box_content">
<div class="box_bg"></div>
{{ obj.description }}
</div>
{% include profile-box.html data=obj.children %}
{% endfor %}