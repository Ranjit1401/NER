import pytest
import uuid
import datetime
from pydantic import ValidationError
from apps.api.schemas.domain import (
    DisasterEventCreate, DisasterType, SeverityLevel, DisasterStatus,
    RoadSegmentCreate, RoadStatus,
    LogisticsHubCreate, HubType, HubStatus,
    InventoryItemCreate,
    DispatchOrderCreate, DispatchStatus,
    PointCoordinates, LineCoordinates, PolygonCoordinates
)
from apps.api.services.gis_utils import (
    point_to_wkt, line_to_wkt, polygon_to_wkt,
    geometry_to_point_coords, geometry_to_line_coords, geometry_to_polygon_coords
)
from shapely.geometry import Point, LineString, Polygon

def test_point_coordinates_validation():
    pt = PointCoordinates(latitude=26.1833, longitude=91.7333)
    assert pt.latitude == 26.1833
    assert pt.longitude == 91.7333

    with pytest.raises(ValidationError):
        PointCoordinates(latitude=95.0, longitude=91.7333)

def test_disaster_schema_validation():
    event = DisasterEventCreate(
        title="Test Flood Event",
        disaster_type=DisasterType.FLOOD,
        severity=SeverityLevel.HIGH,
        affected_state="Assam",
        location=PointCoordinates(latitude=26.18, longitude=91.73)
    )
    assert event.disaster_type == DisasterType.FLOOD
    assert event.status == DisasterStatus.ACTIVE

def test_gis_utils_formatting():
    pt = PointCoordinates(latitude=25.5, longitude=91.8)
    wkt = point_to_wkt(pt)
    assert wkt == "SRID=4326;POINT(91.8 25.5)"

    line = LineCoordinates(points=[
        PointCoordinates(latitude=25.5, longitude=91.8),
        PointCoordinates(latitude=25.6, longitude=91.9)
    ])
    line_wkt = line_to_wkt(line)
    assert line_wkt == "SRID=4326;LINESTRING(91.8 25.5, 91.9 25.6)"

def test_shapely_conversion():
    shp_pt = Point(91.8, 25.5)
    coords = geometry_to_point_coords(shp_pt)
    assert coords.latitude == 25.5
    assert coords.longitude == 91.8

    shp_line = LineString([(91.8, 25.5), (91.9, 25.6)])
    line_coords = geometry_to_line_coords(shp_line)
    assert len(line_coords.points) == 2
    assert line_coords.points[0].latitude == 25.5
