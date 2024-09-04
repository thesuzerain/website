---
layout: base
title: Projects
---

<div class="projects-container">
    <h2>Projects</h2>
    <div class="projects-grid">
        {%- for project in collections.project -%}
            <div class="project-card">
                <div class="project-header">
                    <i class="{{project.data.icon}} folder-icon"></i>
                    <div class="small-icons">
                        <a href={{project.data.url}}><i class="fa-brands fa-github"></i></a>
                    </div>
                </div>
                <h3>{{project.data.title}}</h3>
                <p>{{project.data.description}}</p>
                <a href="{{project.url}}" class="cta-btn">Read more</a>
            </div>
        {%- endfor -%}
    </div>
</div>
