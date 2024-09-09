---
layout: project
title: Pareto database
tags: project
url: https://github.com/thesuzerain/pareto-hockey-populate
description:  A database and backend for hockey statistic analysis, and lead in development of novel valuable metrics currently in discussion of being sold to hockey data aggregators like RinkNet and EliteProspects.
icon: fa-solid fa-hockey-puck
tools: Rust, Sqlite

---


<div class='insurgence-card'>
<p>A minor project for caching and aggregating NHL prospect and career data in Sqlite for complex queries.</p>
<p>Along with several devout hockey enthusiast friends, we theorized a novel metric <i>p</i> based around the Pareto principle, as a predictor of how young pre-NHL prospects will perform in their first year of professional hockey (which could be use to influence draft choices and trades).</p>
<p>The <a href="{{url}}">pareto-hockey-populate</a> repo maintained a local cache of prospect data from serveral hockey data aggregators, such as EliteProspects, allowing faster access and more complicated queries over the data than the API allowed.</p>
<p>Unfortunately, the resultant data analysis did not provide the hoped-for results. While an excellent predictor of points and goals earned in their first season, <i>p</i> and its derivative values performed no better than simpler metrics, like <i>points per game</i> or <i>goals / team's goals</i>.
</p>
</div>

<a href="{{url}}" class='cta-btn'>
Find out more: <i class="fa-solid fa-gamepad"></i>
</a>
