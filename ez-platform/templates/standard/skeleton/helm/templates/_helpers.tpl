{{/*
EZ Lite chart helpers — ${{ values.name }}
*/}}

{{/* Expand the name of the chart */}}
{{- define "ez.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Create a default fully qualified app name */}}
{{- define "ez.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/* Create chart label */}}
{{- define "ez.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Standard EZ labels */}}
{{- define "ez.labels" -}}
helm.sh/chart:                {{ include "ez.chart" . }}
{{ include "ez.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version:    {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
ez.platform/team:             {{ .Values.global.team | default "${{ values.team }}" }}
ez.platform/tier:             "standard"
ez.platform/environment:      {{ .Values.global.environment | default "unknown" }}
{{- end }}

{{/* Selector labels */}}
{{- define "ez.selectorLabels" -}}
app.kubernetes.io/name:     {{ include "ez.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/* Service account name */}}
{{- define "ez.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "ez.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
