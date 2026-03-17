import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { joinByInvite } from "../api/groups";
import { useGroups } from "../context/GroupContext";

export default function GroupJoinPage() {
  const { t } = useTranslation();
  const { code } = useParams();
  const navigate = useNavigate();
  const { refreshGroups } = useGroups();
  const [status, setStatus] = useState("joining");
  const [error, setError] = useState("");

  useEffect(() => {
    joinByInvite(code)
      .then((res) => {
        refreshGroups();
        setStatus("success");
        setTimeout(() => navigate(`/groups/${res.data._id}`), 1500);
      })
      .catch((err) => {
        setError(err.response?.data?.error || t("groupJoin.failedToJoin"));
        setStatus("error");
      });
  }, [code]);

  if (status === "joining") return <div className="loading">{t("groupJoin.joining")}</div>;
  if (status === "error") return (
    <div style={{ textAlign: "center", padding: "3rem" }}>
      <div className="alert alert-danger">{error}</div>
      <button className="btn btn-primary mt-1" onClick={() => navigate("/groups")}>{t("groupJoin.goToGroups")}</button>
    </div>
  );
  return <div className="loading">{t("groupJoin.joined")}</div>;
}
