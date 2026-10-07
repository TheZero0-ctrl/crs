# CRS reference documents

This folder contains reference material for an interactive website about coordinate reference systems.

## Website documentation

- [Build plan and design decisions](build-plan.md).
- [Implementation, coordinate conventions, and verification](implementation.md).
- [Run and build instructions](../README.md).

## Article

[EPSG:4326 and EPSG:5186 learning resources](epsg-4326-and-5186-resources.md) contains annotated articles, reference definitions, videos, and suggestions for interactive lessons.

[Coordinate reference systems](coordinate-reference-systems.md) is a Markdown extraction of chapter 8 of QGIS 3.44's *A Gentle Introduction to GIS*. It includes all article sections, figure captions, exercises, and further reading. Site navigation and page footer controls have been removed. Images link to the original QGIS-hosted files and require an internet connection.

## Source and attribution

- Publisher: QGIS project.
- Document: *A Gentle Introduction to GIS*, chapter 8, "Coordinate Reference Systems".
- Version: QGIS 3.44, English.
- Original article: https://docs.qgis.org/3.44/en/docs/gentle_gis_introduction/coordinate_reference_systems.html
- Retrieved: 2026-10-07.
- Source page last updated: 2026-08-10, 20:31 UTC.
- Editable upstream source: https://github.com/qgis/QGIS-Documentation/blob/release-3_44/docs/gentle_gis_introduction/coordinate_reference_systems.rst
- Authors listed in the introduction: T. Sutton, O. Dassau, M. Sutton.
- Copyright notice in the introduction: Copyright (c) 2009 Chief Directorate: Spatial Planning & Information, Department of Land Affairs, Eastern Cape.
- Site footer copyright: QGIS project, 2002-present.
- License: GNU Free Documentation License, version 1.2 or later, with no Invariant Sections, no Front-Cover Texts, and no Back-Cover Texts.
- License and copyright source: https://docs.qgis.org/3.44/en/docs/gentle_gis_introduction/preamble.html
- License text: https://docs.qgis.org/3.44/en/docs/gentle_gis_introduction/gnu_free_documentation_license.html

The article's wording is retained apart from Markdown formatting and typographic normalization. Image URLs and links to other QGIS chapters are absolute links.

## Notes for the interactive website

The extracted article retains some simplifications and inaccuracies from the source. Account for these when turning the text into explanations or visualizations:

- A CRS can be two-dimensional or three-dimensional. Coordinates do not always require three numbers.
- Standard UTM eastings increase eastward and northings increase northward in both hemispheres. The source's statements that southern-hemisphere UTM values increase westward and southward are incorrect. Its worked false-origin example does use the correct signs.
- A UTM zone and hemisphere do not fully specify a CRS. Include the datum, such as WGS 84, when identifying a CRS.
- Equidistant projections preserve distances along particular lines or from particular points, not every distance on a map.
- Conformal projections preserve local angles and shapes, not the size or shape of every large region.
- Mollweide is an equal-area pseudocylindrical projection. The source calls it cylindrical.
- The ground distance of one degree of latitude is approximately constant, not exactly constant. The source's degree and second distance values are approximations.
- The globe-and-light explanation illustrates projection families. Many mathematical map projections are not literal light projections.
- Assigning a CRS tells software how to interpret existing coordinates. Reprojecting transforms coordinates. On-the-fly reprojection transforms the display without rewriting the original layer coordinates.

These notes are editorial guidance for the website, not part of the extracted article.
