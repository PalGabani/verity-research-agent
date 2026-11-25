from app.models import Source
from app.research import EvidenceClaim, _canonical_url, _validated_status, excerpt_is_verifiable


def test_excerpt_verification_ignores_case_and_whitespace():
    assert excerpt_is_verifiable(
        "A reliable source says this result\nwas independently reviewed.",
        "THIS RESULT was independently   reviewed.",
    )


def test_excerpt_verification_rejects_paraphrases():
    assert not excerpt_is_verifiable(
        "The study included 1,200 participants.",
        "The study included over one thousand participants.",
    )


def test_unmatched_excerpt_cannot_be_marked_supported():
    source = Source(
        title="Study",
        url="https://example.org/study",
        canonical_url="https://example.org/study",
        domain="example.org",
        content="The study included 1,200 participants.",
    )
    claim = EvidenceClaim(
        text="The study had more than a thousand participants.",
        source_id=1,
        excerpt="The study included over one thousand participants.",
        status="supported",
    )
    assert _validated_status(claim, source) == "unverified"


def test_canonical_url_deduplicates_tracking_and_fragments():
    assert _canonical_url("HTTPS://Example.org/report/?utm_source=feed#summary") == (
        "https://example.org/report"
    )


def test_canonical_url_rejects_non_web_schemes():
    assert _canonical_url("javascript:alert(1)") is None
