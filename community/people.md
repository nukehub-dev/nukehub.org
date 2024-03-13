---
layout: page
id: people
title: People
description: >-
    Meet the passionate individuals behind NukeHub. Discover the Executive Council 
    members who guide our mission in advancing nuclear technology, 
    their roles, affiliations, and ways to connect with them.
permalink: /people
---
{% for obj in site.data.people %}
# {{ obj.title }}
<div class="box_content">
    <div class="box_bg"></div>
    <p>
        {{ obj.description }}
    </p>
</div>
{% include profile-box.html data=obj.children %}
{% endfor %}
