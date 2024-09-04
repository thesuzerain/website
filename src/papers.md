---
layout: base
title: Papers
---

<div class="projects-container">
    <h2>Papers</h2>
    <div class="projects-column">
        {%- for paper in collections.paper -%}
            <div class="project-card">
                <div class="project-header">
                  <i class="{{paper.data.icon}} folder-icon"></i>
                    <h3>{{paper.data.title}}</h3>
                  <a href="{{paper.url}}" class="cta-btn">Read more</a>
                </div>
              <p>{{paper.data.description}}</p>
            </div>
        {%- endfor -%}
    </div>
</div>
