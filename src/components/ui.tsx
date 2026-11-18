"use client";

/* eslint-disable @next/next/no-img-element -- IndexedDB内のdata URLを表示する。 */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Item } from "@/lib/types";
import { getImage } from "@/lib/idb";
import { displayDate } from "@/lib/dates";
import { Icon } from "./icons";

export function itemUrl(id: string, returning = false): string {
  return process.env.NEXT_PUBLIC_STATIC_EXPORT === "1"
    ? `/items/${returning ? "return" : "detail"}?id=${encodeURIComponent(id)}`
    : `/items/${encodeURIComponent(id)}${returning ? "/return" : ""}`;
}

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Photo({
  imageKey,
  alt,
  className = "",
}: {
  imageKey?: string;
  alt: string;
  className?: string;
}) {
  const [image, setImage] = useState<{ key: string; source?: string }>();
  useEffect(() => {
    let active = true;
    if (imageKey)
      getImage(imageKey)
        .then((value) => {
          if (active) setImage({ key: imageKey, source: value });
        })
        .catch(() => {
          if (active) setImage({ key: imageKey });
        });
    return () => {
      active = false;
    };
  }, [imageKey]);
  const source = image?.key === imageKey ? image?.source : undefined;
  return source ? (
    <img className={`item-photo ${className}`} src={source} alt={alt} />
  ) : (
    <div className={`photo-placeholder ${className}`}>
      <Icon name="items" />
      <span>写真なし</span>
    </div>
  );
}

export function ValuableBadge() {
  return (
    <span className="badge valuable">
      <Icon name="shield" size={13} />
      貴重品
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty">
      <Icon name="items" size={32} />
      <p>{children}</p>
    </div>
  );
}

export function ItemCard({ item }: { item: Item }) {
  return (
    <Link href={itemUrl(item.id)} className="item-card">
      <div className="card-photo">
        <Photo imageKey={item.photos[0]} alt={item.features} />
        {item.valuable && <ValuableBadge />}
      </div>
      <div className="card-body">
        <span className="item-number">{item.number}</span>
        <h3>{item.features.split("、")[0]}</h3>
        <p>
          {item.colors.join("・")} <span>／</span> {item.category}
        </p>
        <div className="card-meta">
          <Icon name="home" size={14} />
          {item.location}
        </div>
        <div className="card-meta">
          <Icon name="clock" size={14} />
          {displayDate(item.foundAt)}
        </div>
      </div>
    </Link>
  );
}

export function Field({
  label,
  children,
  hint,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="error-message" role="alert">
      {message}
    </p>
  ) : null;
}
