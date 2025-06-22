# Export/Import Procedure for Learning Content

This document describes the procedure for exporting and importing learning content in the HEFL platform. It is intended for backend developers who want to extend or adapt the data model or the export/import logic.

## Overview

The export/import procedure is used to export the current state of the learning content (including all dependent entities) into a structured JSON file and later import this data into an (empty) database. This is useful, for example, for backups, migrations, or cloning environments.

## Process

### Export
- The `exportContent()` method in the `ContentManagementService` exports all relevant tables.
- The data is stored in an object with metadata (version, export date, description) and a `data` block containing all entities.
- The export currently includes (among others) the following tables:
  - subjects
  - modules
  - moduleConceptGoals
  - moduleHighlightConcepts
  - moduleSettings
  - conceptGraphs
  - conceptNodes
  - conceptEdges
  - conceptFamilies
  - contentNodes
  - contentElements (including related ContentViews, Files, Questions)
  - ... (see code for more)

### Import
- The `importContent(data)` method imports the data in a defined order to ensure referential integrity.
- Before import, all dependent tables are cleared (in reverse order), while subjects are retained to preserve user-subject assignments.
- The data is imported in several phases:
  1. Base entities (Subjects, Files, Modules, ModuleHighlightConcepts, ModuleSettings)
  2. Concept structure (ConceptNodes, ConceptGraphs, ConceptEdges, ConceptFamilies, ModuleConceptGoals)
  3. Content structure (ContentNodes, ContentEdges, Requirements, Trainings)
  4. Questions and related entities (Questions, MCQuestions, FreeTextQuestions, etc.)
  5. ContentElements and ContentViews (in batches)

## Extensibility

**Important:**
If new tables are added to the Prisma schema that are relevant for export/import (e.g. new entity types, relations, settings),
they must be explicitly included in the `exportContent()` and `importContent()` methods.

- In export: The data of the new table(s) must be queried and added to the export object.
- In import: The data must be imported at the appropriate place (according to dependencies) and considered when clearing the database.

**Note:**
The order during import is crucial to avoid foreign key errors. New tables should be inserted so that all dependencies are satisfied.

## Example for an Extension
Suppose a new table `LearningBadge` is introduced:
- In export: Add `this.prisma.learningBadge.findMany()` to the Promise.all and include it in the return object.
- In import: Add `prisma.learningBadge.deleteMany()` when clearing the database and import after the dependent entities.

## Contact
If you have questions or are unsure about extending the procedure, please consult with the backend team.
