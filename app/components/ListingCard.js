"use client";

import Link from "next/link";
import { useRef } from "react";

export default function ListingCard({ listing }) {
  const images = JSON.parse(listing.images || "[]");
  const innerRef = useRef(null);
  const glareRef = useRef(null);

  function handleMouseMove(e) {
    const el = innerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--rx", `${(x - 0.5) * 14}deg`);
    el.style.setProperty("--ry", `${(0.5 - y) * 14}deg`);
    if (glareRef.current) {
      glareRef.current.style.setProperty("--glare-x", `${x * 100}%`);
      glareRef.current.style.setProperty("--glare-y", `${y * 100}%`);
      glareRef.current.style.setProperty("--glare-opacity", "1");
    }
  }

  function handleMouseLeave() {
    innerRef.current?.style.setProperty("--rx", "0deg");
    innerRef.current?.style.setProperty("--ry", "0deg");
    glareRef.current?.style.setProperty("--glare-opacity", "0");
  }

  return (
    <Link
      href={`/product/${listing.id}`}
      className="card tilt-card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={innerRef} className="tilt-card-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="card-image" src={images[0] || "/window.svg"} alt={listing.title} />
        <div className="card-body">
          <span className="badge">{listing.category}</span>
          <strong>{listing.title}</strong>
          <span className="price">₹{listing.price.toLocaleString("en-IN")}</span>
        </div>
        <div ref={glareRef} className="tilt-card-glare" />
      </div>
    </Link>
  );
}
