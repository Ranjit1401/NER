from typing import Any
import geoalchemy2
from geoalchemy2.shape import to_shape
from shapely.geometry import Point, LineString, Polygon
from shapely import wkt
from apps.api.schemas.domain import PointCoordinates, LineCoordinates, PolygonCoordinates

def point_to_wkt(pt: PointCoordinates) -> str:
    return f"SRID=4326;POINT({pt.longitude} {pt.latitude})"

def line_to_wkt(line: LineCoordinates) -> str:
    pts_str = ", ".join(f"{pt.longitude} {pt.latitude}" for pt in line.points)
    return f"SRID=4326;LINESTRING({pts_str})"

def polygon_to_wkt(poly: PolygonCoordinates) -> str:
    pts = list(poly.exterior)
    if pts[0] != pts[-1]:
        pts.append(pts[0])
    pts_str = ", ".join(f"{pt.longitude} {pt.latitude}" for pt in pts)
    return f"SRID=4326;POLYGON(({pts_str}))"

def geometry_to_point_coords(geom: Any) -> PointCoordinates:
    if isinstance(geom, geoalchemy2.WKBElement):
        shape = to_shape(geom)
        return PointCoordinates(latitude=shape.y, longitude=shape.x)
    elif isinstance(geom, Point):
        return PointCoordinates(latitude=geom.y, longitude=geom.x)
    elif isinstance(geom, str):
        cleaned = geom.split(";")[-1] if ";" in geom else geom
        shape = wkt.loads(cleaned)
        return PointCoordinates(latitude=shape.y, longitude=shape.x)
    raise ValueError("Invalid Point geometry format")

def geometry_to_line_coords(geom: Any) -> LineCoordinates:
    if isinstance(geom, geoalchemy2.WKBElement):
        shape = to_shape(geom)
        pts = [PointCoordinates(latitude=pt[1], longitude=pt[0]) for pt in shape.coords]
        return LineCoordinates(points=pts)
    elif isinstance(geom, LineString):
        pts = [PointCoordinates(latitude=pt[1], longitude=pt[0]) for pt in geom.coords]
        return LineCoordinates(points=pts)
    elif isinstance(geom, str):
        cleaned = geom.split(";")[-1] if ";" in geom else geom
        shape = wkt.loads(cleaned)
        pts = [PointCoordinates(latitude=pt[1], longitude=pt[0]) for pt in shape.coords]
        return LineCoordinates(points=pts)
    raise ValueError("Invalid LineString geometry format")

def geometry_to_polygon_coords(geom: Any) -> PolygonCoordinates | None:
    if geom is None:
        return None
    if isinstance(geom, geoalchemy2.WKBElement):
        shape = to_shape(geom)
        pts = [PointCoordinates(latitude=pt[1], longitude=pt[0]) for pt in shape.exterior.coords]
        return PolygonCoordinates(exterior=pts)
    elif isinstance(geom, Polygon):
        pts = [PointCoordinates(latitude=pt[1], longitude=pt[0]) for pt in geom.exterior.coords]
        return PolygonCoordinates(exterior=pts)
    elif isinstance(geom, str):
        cleaned = geom.split(";")[-1] if ";" in geom else geom
        shape = wkt.loads(cleaned)
        pts = [PointCoordinates(latitude=pt[1], longitude=pt[0]) for pt in shape.exterior.coords]
        return PolygonCoordinates(exterior=pts)
    return None
