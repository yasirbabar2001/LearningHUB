# Data-Only Idea Insights

## Goal
Remove all generative AI from ABHI IDEA INSIGHTS and calculate every insight directly from submitted idea records.

## Changes
- Remove the AI service call, AI button, AI wording, and unused AI-related imports.
- Keep deterministic similarity detection based on shared keywords; show the matching score and never merge ideas automatically.
- Generate live statistical insights from available records only: category momentum, recurring keywords/problems, dormant categories, cross-functional opportunities, pipeline conversion, implementation outcomes, and measured financial impact.
- Label the analysis as data-driven and show the data window/sample size so management can understand its basis.
- Use only recorded fields; where data is insufficient, display that clearly rather than predicting or inventing an insight.

## Verification
- Open Idea Insights as an administrator and confirm the data-only sections render from current records.
- Confirm there is no AI generation control or AI gateway request in the Ideas implementation.
- Confirm the application builds without errors.
